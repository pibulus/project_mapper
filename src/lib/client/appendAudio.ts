import type { ConversationData } from "$lib/core/types";
import { get } from "svelte/store";
import { currentProject } from "$lib/stores/projectStore";

type AppendMergeProject = Pick<
  ConversationData,
  "id" | "transcript" | "summary" | "actionItems" | "topics" | "edges"
>;

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
  formData.append("existingSummary", project.summary || "");
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
    updates: mergeAppendUpdates(project, mergeTarget, result),
    warnings: result.warnings ?? [],
  };
}

export function mergeAppendUpdates(
  baseProject: AppendMergeProject,
  latestProject: AppendMergeProject,
  result: AppendAudioResponse,
): Partial<ConversationData> {
  const topics = mergeNodes(
    baseProject.topics || [],
    latestProject.topics || [],
    result.topics?.nodes || [],
  );
  const edges = mergeEdges(
    baseProject.edges || [],
    latestProject.edges || [],
    result.topics?.edges || [],
    topics,
  );

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
    topics,
    edges,
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
      if (!latestItem) {
        mergedById.set(returnedItem.id, returnedItem);
      }
      continue;
    }

    if (!latestItem) {
      continue;
    }

    const changedLocally = latestItem.updated_at !== baseItem.updated_at;
    mergedById.set(returnedItem.id, changedLocally ? latestItem : returnedItem);
  }

  return [...mergedById.values()].sort((a, b) => a.sort_order - b.sort_order);
}

function mergeNodes(
  baseNodes: ConversationData["topics"],
  latestNodes: ConversationData["topics"],
  returnedNodes: ConversationData["topics"],
) {
  const baseById = new Map(baseNodes.map((node) => [node.id, node]));
  const latestById = new Map(latestNodes.map((node) => [node.id, node]));
  const mergedById = new Map(latestNodes.map((node) => [node.id, node]));

  for (const returnedNode of returnedNodes) {
    const baseNode = baseById.get(returnedNode.id);
    const latestNode = latestById.get(returnedNode.id);

    if (!baseNode) {
      if (!latestNode) {
        mergedById.set(returnedNode.id, returnedNode);
      }
      continue;
    }

    if (!latestNode) {
      continue;
    }

    mergedById.set(
      returnedNode.id,
      hasChanged(latestNode, baseNode) ? latestNode : returnedNode,
    );
  }

  return [...mergedById.values()];
}

function mergeEdges(
  baseEdges: ConversationData["edges"],
  latestEdges: ConversationData["edges"],
  returnedEdges: ConversationData["edges"],
  mergedNodes: ConversationData["topics"],
) {
  const validNodeIds = new Set(mergedNodes.map((node) => node.id));
  const baseByKey = new Map(baseEdges.map((edge) => [edgeKey(edge), edge]));
  const latestByKey = new Map(
    latestEdges
      .filter((edge) => isValidEdge(edge, validNodeIds))
      .map((edge) => [edgeKey(edge), edge]),
  );
  const mergedByKey = new Map(latestByKey);

  for (const returnedEdge of returnedEdges) {
    if (!isValidEdge(returnedEdge, validNodeIds)) continue;

    const key = edgeKey(returnedEdge);
    const baseEdge = baseByKey.get(key);
    const latestEdge = latestByKey.get(key);

    if (!baseEdge) {
      if (!latestEdge) {
        mergedByKey.set(key, returnedEdge);
      }
      continue;
    }

    if (!latestEdge) {
      continue;
    }

    mergedByKey.set(
      key,
      hasChanged(latestEdge, baseEdge) ? latestEdge : returnedEdge,
    );
  }

  return [...mergedByKey.values()];
}

function edgeKey(edge: { source_topic_id: string; target_topic_id: string }) {
  return `${edge.source_topic_id}->${edge.target_topic_id}`;
}

function isValidEdge(
  edge: { source_topic_id: string; target_topic_id: string },
  validNodeIds: Set<string>,
) {
  return (
    validNodeIds.has(edge.source_topic_id) &&
    validNodeIds.has(edge.target_topic_id)
  );
}

function hasChanged<T>(latest: T, base: T) {
  return JSON.stringify(latest) !== JSON.stringify(base);
}
