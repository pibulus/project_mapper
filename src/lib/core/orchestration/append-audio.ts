import type { ConversationData } from "$lib/core/types";

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

  return {
    updates: {
      transcript: result?.transcript?.text ?? project.transcript,
      summary: result.summary ?? project.summary,
      actionItems: result.actionItems ?? project.actionItems,
      topics: result.topics?.nodes ?? project.topics,
      edges: result.topics?.edges ?? project.edges,
    },
    warnings: result.warnings ?? [],
  };
}
