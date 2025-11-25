/**
 * POST /api/process
 *
 * Process audio or text input to create a new conversation
 *
 * Runs parallel AI analysis:
 * - Transcribe audio (if audio input)
 * - Extract topics and create knowledge graph
 * - Extract action items
 * - Generate summary
 * - Auto-checkoff action items if context provided
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getAIService, transcribeAudio } from "$lib/server/geminiService";
import { processText } from "$lib/core/orchestration/conversation-flow";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

export const POST: RequestHandler = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") || "";

    // Handle multipart form data (audio upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audioFile = formData.get("audio");
      const conversationId =
        formData.get("conversationId")?.toString() || crypto.randomUUID();

      if (!audioFile || typeof audioFile === "string") {
        return json({ error: "No audio file provided" }, { status: 400 });
      }

      if (audioFile.size > MAX_UPLOAD_BYTES) {
        const mb = (MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0);
        return json(
          { error: `File too large. Maximum size is ${mb}MB` },
          { status: 413 },
        );
      }

      console.log(
        `[API /process] Processing ${(audioFile.size / 1024).toFixed(2)}KB audio`,
      );

      // Transcribe audio (uploads, transcribes, cleans up automatically)
      const { text, speakers } = await transcribeAudio(audioFile);

      // Process the transcribed text (topics, action items, summary)
      const aiService = getAIService();
      const result = await processText(
        aiService,
        text,
        conversationId,
        speakers,
      );

      console.log("[API /process] ✅ Audio processed successfully");

      return json(result);
    }

    // Handle JSON (text input)
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { text, conversationId } = body;

      if (!text || typeof text !== "string") {
        return json({ error: "No text provided" }, { status: 400 });
      }

      console.log(
        `[API /process] Processing ${text.length} characters of text`,
      );

      const aiService = getAIService();
      const id = conversationId || crypto.randomUUID();

      // Use core orchestration
      const result = await processText(aiService, text, id);

      console.log("[API /process] ✅ Text processed successfully");

      return json(result);
    }

    return json({ error: "Invalid content type" }, { status: 400 });
  } catch (error: any) {
    console.error("[API /process] ❌ Error:", error);

    const message = error?.message?.toLowerCase() || "";
    let friendlyMessage =
      "Something went wrong processing your input. Please try again.";

    if (message.includes("api key")) {
      friendlyMessage = "Server configuration error: Gemini API key not set";
    } else if (message.includes("quota") || message.includes("limit")) {
      friendlyMessage = "API quota exceeded. Please try again in a moment.";
    } else if (message.includes("network")) {
      friendlyMessage = "Network error. Please check your connection.";
    }

    return json({ error: friendlyMessage }, { status: 500 });
  }
};
