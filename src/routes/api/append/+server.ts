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
import {
  getAllowedAudioDescription,
  getMaxUploadBytes,
  guardRequest,
  isAllowedAudioUpload,
} from "$lib/server/apiGuard";
import { getAIService, transcribeAudio } from "$lib/server/geminiService";
import {
  processText,
  type ProcessTextResult,
} from "$lib/core/orchestration/conversation-flow";
import type {
  ActionItem,
  ActionItemInput,
  ActionItemStatusUpdate,
  ConversationGraph,
  Edge,
  Node,
  NodeInput,
} from "$lib/core/types";
import { postUpdateToParty } from "$lib/server/partyUpdates";

const MAX_UPLOAD_BYTES = getMaxUploadBytes();

export const POST: RequestHandler = async (event) => {
  try {
    const guardResponse = guardRequest(event);
    if (guardResponse) {
      return guardResponse;
    }

    const { request } = event;
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const conversationId = formData.get("conversationId")?.toString();
    const existingTranscript = formData
      .get("existingTranscript")
      ?.toString()
      .trim();
    const existingActionItemsJson = formData
      .get("existingActionItems")
      ?.toString();
    const existingTopicsJson = formData.get("existingTopics")?.toString();
    const existingEdgesJson = formData.get("existingEdges")?.toString();

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

    if (!isAllowedAudioUpload(audioFile)) {
      return json(
        {
          error: `Unsupported audio type. Allowed types: ${getAllowedAudioDescription()}`,
        },
        { status: 415 },
      );
    }

    const existingActionItems = sanitizeExistingActionItems(
      conversationId,
      parseArrayField(existingActionItemsJson, "existing action items"),
    );
    const existingTopics = sanitizeExistingTopics(
      conversationId,
      parseArrayField(existingTopicsJson, "existing topics"),
    );
    const existingEdges = sanitizeExistingEdges(
      conversationId,
      parseArrayField(existingEdgesJson, "existing edges"),
    );
    const existingTopicInputs = existingTopics.map(topicToInput);

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
      existingTopicInputs,
    );

    const transcript = {
      ...analysisResult.transcript,
      text: mergeTranscript(existingTranscript || "", text),
    };

    const actionItems = buildUpdatedActionItems(
      conversationId,
      existingActionItems,
      analysisResult.actionItems,
      analysisResult.statusUpdates,
    );
    const topics = buildUpdatedTopics(
      conversationId,
      existingTopics,
      existingEdges,
      analysisResult.topics,
    );

    await broadcastUpdates(conversationId, {
      transcript,
      topics,
      summary: analysisResult.summary,
      actionItems,
    });

    console.log("[API /append] ✅ Audio appended successfully");

    return json({
      transcript,
      topics,
      actionItems,
      summary: analysisResult.summary,
      statusUpdates: analysisResult.statusUpdates,
      warnings: analysisResult.warnings,
    });
  } catch (error: any) {
    console.error("[API /append] ❌ Error:", error);

    const message = error?.message?.toLowerCase() || "";
    let friendlyMessage = "Failed to append audio. Please try again.";

    if (message.includes("api key")) {
      friendlyMessage = "Server configuration error: Gemini API key not set";
    } else if (message.includes("quota")) {
      friendlyMessage = "API quota exceeded. Please try again later.";
    } else if (message.includes("origin")) {
      friendlyMessage = "This request is coming from an unexpected origin.";
    }

    return json({ error: friendlyMessage }, { status: error?.status || 500 });
  }
};

function parseArrayField(raw: string | undefined, label: string): unknown[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    console.warn(`[API /append] Ignoring non-array ${label}`);
  } catch {
    console.warn(`[API /append] Failed to parse ${label}`);
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized || null;
}

function mergeTranscript(existingTranscript: string, appendedText: string) {
  return [existingTranscript.trim(), appendedText.trim()]
    .filter(Boolean)
    .join("\n\n");
}

function sanitizeExistingActionItems(
  conversationId: string,
  items: unknown[],
): ActionItem[] {
  const now = new Date().toISOString();
  return items
    .filter(isRecord)
    .map((item, index): ActionItem | null => {
      const description = normalizeString(item.description);
      if (!description) return null;

      return {
        id: normalizeString(item.id) || crypto.randomUUID(),
        conversation_id:
          normalizeString(item.conversation_id) || conversationId,
        description,
        assignee: normalizeNullableString(item.assignee),
        due_date: normalizeNullableString(item.due_date),
        status: item.status === "completed" ? "completed" : "pending",
        created_at: normalizeString(item.created_at) || now,
        updated_at: normalizeString(item.updated_at) || now,
        sort_order:
          typeof item.sort_order === "number" && !Number.isNaN(item.sort_order)
            ? item.sort_order
            : (index + 1) * 10,
        ai_checked: item.ai_checked === true || undefined,
        checked_reason: normalizeString(item.checked_reason) || undefined,
      };
    })
    .filter((item): item is ActionItem => Boolean(item));
}

function sanitizeExistingTopics(
  conversationId: string,
  items: unknown[],
): Node[] {
  const now = new Date().toISOString();
  return items
    .filter(isRecord)
    .map((item) => normalizeTopicNode(conversationId, item, now))
    .filter((item): item is Node => Boolean(item));
}

function sanitizeExistingEdges(
  conversationId: string,
  items: unknown[],
): Edge[] {
  const now = new Date().toISOString();
  return items
    .filter(isRecord)
    .map((item) => normalizeEdge(conversationId, item, now))
    .filter((item): item is Edge => Boolean(item));
}

function normalizeTopicNode(
  conversationId: string,
  item: Record<string, unknown>,
  now: string,
): Node | null {
  const id = normalizeString(item.id);
  const label = normalizeString(item.label);
  if (!id || !label) return null;

  return {
    id,
    conversation_id: normalizeString(item.conversation_id) || conversationId,
    label,
    emoji: normalizeString(item.emoji),
    color: normalizeString(item.color) || "#999999",
    created_at: normalizeString(item.created_at) || now,
  };
}

function normalizeEdge(
  conversationId: string,
  item: Record<string, unknown>,
  now: string,
): Edge | null {
  const source_topic_id = normalizeString(item.source_topic_id);
  const target_topic_id = normalizeString(item.target_topic_id);
  if (!source_topic_id || !target_topic_id) return null;

  return {
    id: normalizeString(item.id) || crypto.randomUUID(),
    conversation_id: normalizeString(item.conversation_id) || conversationId,
    source_topic_id,
    target_topic_id,
    color: normalizeString(item.color) || "#999999",
    created_at: normalizeString(item.created_at) || now,
  };
}

function topicToInput(topic: Node): NodeInput {
  return {
    id: topic.id,
    label: topic.label,
    color: topic.color,
    emoji: topic.emoji,
  };
}

function createActionItemsFromInputs(
  conversationId: string,
  inputs: ActionItemInput[],
  startingSortOrder: number,
  existingItems: ActionItem[] = [],
): ActionItem[] {
  const now = new Date().toISOString();
  const seenDescriptions = new Set(
    existingItems.map((item) => item.description.trim().toLowerCase()),
  );

  return inputs
    .map((item) => ({
      ...item,
      description: item.description.trim(),
    }))
    .filter((item) => {
      if (!item.description) return false;
      const key = item.description.toLowerCase();
      if (seenDescriptions.has(key)) return false;
      seenDescriptions.add(key);
      return true;
    })
    .map((item, index) => ({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      description: item.description,
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
    existingItems,
  );

  const merged = [...existingItems, ...newItems];
  const withStatuses = applyStatusUpdates(merged, statusUpdates);

  return withStatuses.sort((a, b) => a.sort_order - b.sort_order);
}

function buildUpdatedTopics(
  conversationId: string,
  existingNodes: Node[],
  existingEdges: Edge[],
  graph: ConversationGraph,
): { nodes: Node[]; edges: Edge[] } {
  const now = new Date().toISOString();
  const nodesById = new Map(existingNodes.map((node) => [node.id, node]));

  for (const node of graph.nodes) {
    const normalized = normalizeTopicNode(conversationId, node, now);
    if (!normalized) continue;

    const current = nodesById.get(normalized.id);
    nodesById.set(normalized.id, current || normalized);
  }

  const nodes = [...nodesById.values()];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgesByPair = new Map<string, Edge>();

  for (const edge of existingEdges) {
    if (
      edge.source_topic_id &&
      edge.target_topic_id &&
      nodeIds.has(edge.source_topic_id) &&
      nodeIds.has(edge.target_topic_id)
    ) {
      edgesByPair.set(edgeKey(edge), edge);
    }
  }

  for (const edge of graph.edges) {
    const normalized = normalizeEdge(conversationId, edge, now);
    if (
      !normalized ||
      !nodeIds.has(normalized.source_topic_id) ||
      !nodeIds.has(normalized.target_topic_id)
    ) {
      continue;
    }

    const key = edgeKey(normalized);
    if (!edgesByPair.has(key)) {
      edgesByPair.set(key, normalized);
    }
  }

  return {
    nodes,
    edges: [...edgesByPair.values()],
  };
}

function edgeKey(edge: Pick<Edge, "source_topic_id" | "target_topic_id">) {
  return `${edge.source_topic_id}->${edge.target_topic_id}`;
}

async function broadcastUpdates(
  conversationId: string,
  result: Pick<ProcessTextResult, "transcript" | "summary"> & {
    topics: { nodes: Node[]; edges: Edge[] };
    actionItems: ActionItem[];
  },
) {
  const payloads = [
    { type: "transcript", data: result.transcript },
    { type: "topics", data: result.topics },
    { type: "summary", data: result.summary },
    { type: "action-items", data: result.actionItems },
  ];

  await Promise.all(
    payloads.map((payload) => postUpdateToParty(conversationId, payload)),
  );
}
