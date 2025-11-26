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
import {
  processText,
  type ProcessTextResult,
} from "$lib/core/orchestration/conversation-flow";
import type {
  ActionItem,
  ActionItemInput,
  ActionItemStatusUpdate,
} from "$lib/core/types";
import { postUpdateToParty } from "$lib/server/partyUpdates";

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
    existingActionItems = sanitizeExistingActionItems(
      conversationId,
      existingActionItems,
    );

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
    const analysisResult = await processText(
      aiService,
      text,
      conversationId,
      speakers,
      existingActionItems,
    );

    const actionItems = buildUpdatedActionItems(
      conversationId,
      existingActionItems,
      analysisResult.actionItems,
      analysisResult.statusUpdates,
    );

    await broadcastUpdates(conversationId, analysisResult, actionItems);

    console.log("[API /append] ✅ Audio appended successfully");

    return json({
      transcript: analysisResult.transcript,
      topics: analysisResult.topics,
      actionItems,
      summary: analysisResult.summary,
      statusUpdates: analysisResult.statusUpdates,
    });
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

function sanitizeExistingActionItems(
  conversationId: string,
  items: ActionItem[],
): ActionItem[] {
  const now = new Date().toISOString();
  return items.map((item, index) => ({
    id: item.id || crypto.randomUUID(),
    conversation_id: item.conversation_id || conversationId,
    description: item.description?.trim() || "",
    assignee:
      item.assignee === undefined || item.assignee === null
        ? null
        : item.assignee,
    due_date:
      item.due_date === undefined || item.due_date === null
        ? null
        : item.due_date,
    status: item.status === "completed" ? "completed" : "pending",
    created_at: item.created_at || now,
    updated_at: item.updated_at || now,
    sort_order:
      typeof item.sort_order === "number" && !Number.isNaN(item.sort_order)
        ? item.sort_order
        : (index + 1) * 10,
    ai_checked: item.ai_checked,
    checked_reason: item.checked_reason,
  }));
}

function createActionItemsFromInputs(
  conversationId: string,
  inputs: ActionItemInput[],
  startingSortOrder: number,
): ActionItem[] {
  const now = new Date().toISOString();
  return inputs.map((item, index) => ({
    id: crypto.randomUUID(),
    conversation_id: conversationId,
    description: item.description.trim(),
    assignee: item.assignee ?? null,
    due_date: item.due_date ?? null,
    status: "pending",
    created_at: now,
    updated_at: now,
    sort_order: startingSortOrder + (index + 1) * 10,
  }));
}

function applyStatusUpdates(
  actionItems: ActionItem[],
  updates: ActionItemStatusUpdate[],
): ActionItem[] {
  if (!updates?.length) return actionItems;
  const now = new Date().toISOString();
  const lookup = new Map(updates.map((update) => [update.id, update]));

  return actionItems.map((item) => {
    const update = lookup.get(item.id);
    if (!update) return item;
    return {
      ...item,
      status: update.status,
      ai_checked: true,
      checked_reason: update.reason,
      updated_at: now,
    };
  });
}

function buildUpdatedActionItems(
  conversationId: string,
  existingItems: ActionItem[],
  newActionItemInputs: ActionItemInput[],
  statusUpdates: ActionItemStatusUpdate[],
): ActionItem[] {
  const maxSortOrder =
    existingItems.reduce(
      (max, item) =>
        typeof item.sort_order === "number"
          ? Math.max(max, item.sort_order)
          : max,
      0,
    ) || 0;

  const newItems = createActionItemsFromInputs(
    conversationId,
    newActionItemInputs,
    maxSortOrder,
  );

  const merged = [...existingItems, ...newItems];
  const withStatuses = applyStatusUpdates(merged, statusUpdates);

  return withStatuses.sort((a, b) => a.sort_order - b.sort_order);
}

async function broadcastUpdates(
  conversationId: string,
  result: ProcessTextResult,
  actionItems: ActionItem[],
) {
  const payloads = [
    { type: "transcript", data: result.transcript },
    { type: "topics", data: result.topics },
    { type: "summary", data: result.summary },
    { type: "action-items", data: actionItems },
  ];

  if (result.statusUpdates.length > 0) {
    payloads.push({ type: "status-updates", data: result.statusUpdates });
  }

  await Promise.all(
    payloads.map((payload) => postUpdateToParty(conversationId, payload)),
  );
}
