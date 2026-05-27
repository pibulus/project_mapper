/**
 * POST /api/export
 *
 * Transform conversation transcript to different formats using AI
 *
 * Supported formats:
 * - BLOG: Blog post with sections and flow
 * - TECHNICAL_MANUAL: Manual with steps
 * - MEETING: Formal meeting minutes
 * - SPECIFICATIONS: Technical specification
 * - HAIKU: Poetic compact summary
 * - SUMMARY: Executive summary
 * - PLAN: Action plan
 * - RESEARCH: Research notes
 * - JOURNAL: Reflective journal entry
 * - REPORT: Case study/report
 * - CUSTOM: User-supplied transform prompt
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { guardRequest } from "$lib/server/apiGuard";
import { getAIService } from "$lib/server/geminiService";
import { EXPORT_FORMATS } from "$lib/core/export/formats";
import type { ActionItem, Edge, Node } from "$lib/core/types";

export const POST: RequestHandler = async (event) => {
  try {
    const guardResponse = guardRequest(event);
    if (guardResponse) {
      return guardResponse;
    }

    const { request } = event;
    const body = await request.json();
    const { transcript, format, project, customPrompt } = body;

    if (transcript && typeof transcript !== "string") {
      return json({ error: "Transcript must be a string" }, { status: 400 });
    }

    if (!format || typeof format !== "string") {
      return json({ error: "Format required" }, { status: 400 });
    }

    const formatPrompt =
      format === "CUSTOM"
        ? normalizeString(customPrompt)
        : EXPORT_FORMATS[format as keyof typeof EXPORT_FORMATS];

    if (!formatPrompt) {
      const error =
        format === "CUSTOM"
          ? "Custom prompt required"
          : `Unknown format: ${format}`;
      return json({ error }, { status: 400 });
    }

    const aiService = getAIService();
    const exportContext = buildExportContext(
      typeof transcript === "string" ? transcript : "",
      project,
    );

    if (!exportContext.trim()) {
      return json({ error: "Project content required" }, { status: 400 });
    }

    // Use core AI service to generate markdown
    const markdown = await aiService.generateMarkdown(
      formatPrompt,
      exportContext,
    );

    return json({ markdown });
  } catch (error: any) {
    console.error("[API /export] ❌ Error:", error);

    const message = error?.message?.toLowerCase() || "";
    let friendlyMessage = "Failed to generate export. Please try again.";

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

function buildExportContext(transcript: string, project: unknown) {
  if (!isRecord(project)) {
    return transcript;
  }

  const title = normalizeString(project.title);
  const summary = normalizeString(project.summary);
  const projectTranscript = normalizeString(project.transcript) || transcript;
  const actionItems = normalizeActionItems(project.actionItems);
  const topics = normalizeTopics(project.topics);
  const edges = normalizeEdges(project.edges);

  return [
    title ? `PROJECT TITLE:\n${title}` : "",
    summary ? `CURRENT SUMMARY:\n${summary}` : "",
    actionItems.length ? formatActionItems(actionItems) : "",
    topics.length ? formatTopics(topics, edges) : "",
    projectTranscript ? `TRANSCRIPT:\n${projectTranscript}` : "",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeActionItems(value: unknown): ActionItem[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is ActionItem => {
    return isRecord(item) && typeof item.description === "string";
  });
}

function normalizeTopics(value: unknown): Node[] {
  if (!Array.isArray(value)) return [];

  return value.filter((topic): topic is Node => {
    return (
      isRecord(topic) &&
      typeof topic.id === "string" &&
      typeof topic.label === "string"
    );
  });
}

function normalizeEdges(value: unknown): Edge[] {
  if (!Array.isArray(value)) return [];

  return value.filter((edge): edge is Edge => {
    return (
      isRecord(edge) &&
      typeof edge.source_topic_id === "string" &&
      typeof edge.target_topic_id === "string"
    );
  });
}

function formatActionItems(actionItems: ActionItem[]) {
  const open = actionItems.filter((item) => item.status !== "completed");
  const completed = actionItems.filter((item) => item.status === "completed");

  return [
    open.length ? `OPEN ACTION ITEMS:\n${formatActionItemList(open)}` : "",
    completed.length
      ? `COMPLETED ACTION ITEMS:\n${formatActionItemList(completed)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function formatActionItemList(actionItems: ActionItem[]) {
  return actionItems
    .map((item) => {
      const meta = [
        item.assignee ? `assignee: ${item.assignee}` : "",
        item.due_date ? `due: ${item.due_date}` : "",
        item.checked_reason ? `reason: ${item.checked_reason}` : "",
      ]
        .filter(Boolean)
        .join("; ");

      return `- ${item.description}${meta ? ` (${meta})` : ""}`;
    })
    .join("\n");
}

function formatTopics(topics: Node[], edges: Edge[]) {
  const labelById = new Map(topics.map((topic) => [topic.id, topic.label]));
  const topicList = topics
    .map((topic) => `- ${topic.emoji ? `${topic.emoji} ` : ""}${topic.label}`)
    .join("\n");
  const edgeList = edges
    .map((edge) => {
      const source = labelById.get(edge.source_topic_id);
      const target = labelById.get(edge.target_topic_id);
      if (!source || !target) return "";
      return `- ${source} -> ${target}`;
    })
    .filter(Boolean)
    .join("\n");

  return [
    `TOPICS:\n${topicList}`,
    edgeList ? `TOPIC CONNECTIONS:\n${edgeList}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
