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
import {
  getAllowedAudioDescription,
  getMaxUploadBytes,
  guardRequest,
  isAllowedAudioUpload,
} from "$lib/server/apiGuard";
import {
  processText,
  type ProcessTextResult,
} from "$lib/core/orchestration/conversation-flow";
import type { ActionItem, Edge, Node } from "$lib/core/types";

const MAX_UPLOAD_BYTES = getMaxUploadBytes();

export const POST: RequestHandler = async (event) => {
  try {
    const guardResponse = guardRequest(event);
    if (guardResponse) {
      return guardResponse;
    }

    const { request } = event;
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

      if (!isAllowedAudioUpload(audioFile)) {
        return json(
          {
            error: `Unsupported audio type. Allowed types: ${getAllowedAudioDescription()}`,
          },
          { status: 415 },
        );
      }

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

      return json(hydrateProcessResult(result, conversationId));
    }

    // Handle JSON (text input)
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { text, conversationId } = body;

      if (!text || typeof text !== "string") {
        return json({ error: "No text provided" }, { status: 400 });
      }

      const aiService = getAIService();
      const id = conversationId || crypto.randomUUID();

      // Use core orchestration
      const result = await processText(aiService, text, id);

      return json(hydrateProcessResult(result, id));
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
    } else if (message.includes("origin")) {
      friendlyMessage = "This request is coming from an unexpected origin.";
    }

    return json({ error: friendlyMessage }, { status: error?.status || 500 });
  }
};

function hydrateProcessResult(
  result: ProcessTextResult,
  conversationId: string,
) {
  return {
    ...result,
    actionItems: hydrateActionItems(result.actionItems, conversationId),
    topics: {
      nodes: hydrateNodes(result.topics.nodes, conversationId),
      edges: hydrateEdges(result.topics.edges, conversationId),
    },
  };
}

function hydrateActionItems(
  items: ProcessTextResult["actionItems"],
  conversationId: string,
): ActionItem[] {
  const now = new Date().toISOString();

  return items
    .map((item) => ({
      ...item,
      description: item.description.trim(),
    }))
    .filter((item) => item.description)
    .map((item, index) => ({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      description: item.description,
      assignee: item.assignee ?? null,
      due_date: item.due_date ?? null,
      status: "pending" as const,
      created_at: now,
      updated_at: now,
      sort_order: index * 10,
    }));
}

function hydrateNodes(
  nodes: ProcessTextResult["topics"]["nodes"],
  conversationId: string,
): Node[] {
  const now = new Date().toISOString();

  return nodes
    .filter((node) => node.id && node.label)
    .map((node) => ({
      id: node.id,
      conversation_id: conversationId,
      label: node.label,
      emoji: node.emoji || "",
      color: node.color || "#999999",
      created_at: now,
    }));
}

function hydrateEdges(
  edges: ProcessTextResult["topics"]["edges"],
  conversationId: string,
): Edge[] {
  const now = new Date().toISOString();

  return edges
    .filter((edge) => edge.source_topic_id && edge.target_topic_id)
    .map((edge) => ({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      source_topic_id: edge.source_topic_id,
      target_topic_id: edge.target_topic_id,
      color: edge.color || "#999999",
      created_at: now,
    }));
}
