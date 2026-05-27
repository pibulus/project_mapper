import type { ConversationData } from "$lib/core/types";
import { get } from "svelte/store";
import { currentProject } from "$lib/stores/projectStore";

export interface AppendAudioResponse {
  transcript?: {
    text?: string;
  };
  topics?: {
    nodes?: ConversationData["topics"];
    edges?: ConversationData["edges"];
  };
  actionItems?: ConversationData["actionItems"];
  summary?: string;
  warnings?: Array<{
    scope: string;
    message: string;
  }>;
}

export async function appendAudioToProject(
  project: ConversationData,
  file: File,
): Promise<{
  updates: Partial<ConversationData>;
  warnings: AppendAudioResponse["warnings"];
}> {
  const formData = new FormData();
  formData.append("audio", file);
  formData.append("conversationId", project.id);
  formData.append("existingTranscript", project.transcript || "");
  formData.append(
    "existingActionItems",
    JSON.stringify(project.actionItems || []),
  );
  formData.append("existingTopics", JSON.stringify(project.topics || []));
  formData.append("existingEdges", JSON.stringify(project.edges || []));

  const response = await fetch("/api/append", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to append audio");
  }

  const result: AppendAudioResponse = await response.json();
  const latestProject = get(currentProject);
  const mergeTarget =
    latestProject?.id === project.id ? latestProject : project;

  return {
    updates: buildAppendUpdates(project, mergeTarget, result),
    warnings: result.warnings ?? [],
  };
}

function buildAppendUpdates(
  baseProject: ConversationData,
  latestProject: ConversationData,
  result: AppendAudioResponse,
): Partial<ConversationData> {
  return {
    transcript: mergeTranscriptResult(
      baseProject.transcript,
      latestProject.transcript,
      result?.transcript?.text,
    ),
    summary:
      latestProject.summary === baseProject.summary
        ? (result.summary ?? latestProject.summary)
        : latestProject.summary,
    actionItems: mergeActionItems(
      baseProject.actionItems || [],
      latestProject.actionItems || [],
      result.actionItems || [],
    ),
    topics: mergeNodes(latestProject.topics || [], result.topics?.nodes || []),
    edges: mergeEdges(latestProject.edges || [], result.topics?.edges || []),
  };
}

function mergeTranscriptResult(
  baseTranscript: string,
  latestTranscript: string,
  returnedTranscript?: string,
) {
  if (!returnedTranscript) return latestTranscript;
  if (latestTranscript === baseTranscript) return returnedTranscript;

  const appendSegment = extractAppendSegment(
    baseTranscript,
    returnedTranscript,
  );
  if (!appendSegment) return latestTranscript;

  if (latestTranscript.includes(appendSegment)) {
    return latestTranscript;
  }

  return [latestTranscript.trim(), appendSegment].filter(Boolean).join("\n\n");
}

function extractAppendSegment(
  baseTranscript: string,
  returnedTranscript: string,
) {
  const base = baseTranscript.trim();
  const returned = returnedTranscript.trim();

  if (!base) return returned;
  if (!returned.startsWith(base)) return returned;

  return returned.slice(base.length).trim();
}

function mergeActionItems(
  baseItems: ConversationData["actionItems"],
  latestItems: ConversationData["actionItems"],
  returnedItems: ConversationData["actionItems"],
) {
  const baseById = new Map(baseItems.map((item) => [item.id, item]));
  const latestById = new Map(latestItems.map((item) => [item.id, item]));
  const mergedById = new Map(latestItems.map((item) => [item.id, item]));

  for (const returnedItem of returnedItems) {
    const baseItem = baseById.get(returnedItem.id);
    const latestItem = latestById.get(returnedItem.id);

    if (!baseItem) {
      mergedById.set(returnedItem.id, returnedItem);
      continue;
    }

    if (!latestItem) {
      mergedById.set(returnedItem.id, returnedItem);
      continue;
    }

    const changedLocally = latestItem.updated_at !== baseItem.updated_at;
    mergedById.set(returnedItem.id, changedLocally ? latestItem : returnedItem);
  }

  return [...mergedById.values()].sort((a, b) => a.sort_order - b.sort_order);
}

function mergeNodes(
  latestNodes: ConversationData["topics"],
  returnedNodes: ConversationData["topics"],
) {
  const nodesById = new Map(returnedNodes.map((node) => [node.id, node]));

  for (const node of latestNodes) {
    nodesById.set(node.id, node);
  }

  return [...nodesById.values()];
}

function mergeEdges(
  latestEdges: ConversationData["edges"],
  returnedEdges: ConversationData["edges"],
) {
  const edgesByKey = new Map(
    returnedEdges.map((edge) => [edgeKey(edge), edge]),
  );

  for (const edge of latestEdges) {
    edgesByKey.set(edgeKey(edge), edge);
  }

  return [...edgesByKey.values()];
}

function edgeKey(edge: { source_topic_id: string; target_topic_id: string }) {
  return `${edge.source_topic_id}->${edge.target_topic_id}`;
}
