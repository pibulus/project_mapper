/**
 * POST /api/append
 *
 * Append new audio or text to an existing conversation
 *
 * This is where the magic happens:
 * - AI listens to new input
 * - Automatically checks off completed action items
 * - Extracts new action items
 * - Updates the knowledge graph
 * - Generates updated summary
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getAIService, transcribeAudio } from "$lib/server/geminiService";
import { processText } from "$lib/core/orchestration/conversation-flow";
import type { ActionItem } from "$lib/core/types";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const conversationId = formData.get("conversationId")?.toString();
    const existingActionItemsJson = formData
      .get("existingActionItems")
      ?.toString();

    if (!audioFile || typeof audioFile === "string") {
      return json({ error: "No audio file provided" }, { status: 400 });
    }

    if (!conversationId) {
      return json({ error: "Conversation ID required" }, { status: 400 });
    }

    if (audioFile.size > MAX_UPLOAD_BYTES) {
      const mb = (MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0);
      return json(
        { error: `File too large. Maximum size is ${mb}MB` },
        { status: 413 },
      );
    }

    // Parse existing action items if provided
    let existingActionItems: ActionItem[] = [];
    if (existingActionItemsJson) {
      try {
        existingActionItems = JSON.parse(existingActionItemsJson);
      } catch (e) {
        console.warn("[API /append] Failed to parse existing action items");
      }
    }

    console.log(
      `[API /append] Appending ${(audioFile.size / 1024).toFixed(2)}KB audio to conversation ${conversationId}`,
    );
    console.log(
      `[API /append] Tracking ${existingActionItems.length} existing action items`,
    );

    // Transcribe audio (uploads, transcribes, cleans up automatically)
    const { text, speakers } = await transcribeAudio(audioFile);

    const aiService = getAIService();

    // Process with existing action items context
    // The core orchestration will check for completed items
    await processText(
      aiService,
      text,
      conversationId,
      speakers,
      existingActionItems,
    );

    console.log("[API /append] ✅ Audio appended successfully");

    return json({ success: true });
  } catch (error: any) {
    console.error("[API /append] ❌ Error:", error);

    const message = error?.message?.toLowerCase() || "";
    let friendlyMessage = "Failed to append audio. Please try again.";

    if (message.includes("api key")) {
      friendlyMessage = "Server configuration error: Gemini API key not set";
    } else if (message.includes("quota")) {
      friendlyMessage = "API quota exceeded. Please try again later.";
    }

    return json({ error: friendlyMessage }, { status: 500 });
  }
};
