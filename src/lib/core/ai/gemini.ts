/**
 * Gemini AI Service - Framework Agnostic
 *
 * Pure TypeScript wrapper for Google's Generative AI
 * Can be used in any environment (Node, Deno, Browser)
 */

import type {
  ActionItem,
  ActionItemInput,
  ActionItemStatusUpdate,
  ConversationGraph,
  EdgeInput,
  NodeInput,
  TranscriptionResult,
} from "../types/index";

import {
  buildActionItemsPrompt,
  buildActionItemStatusPrompt,
  buildMarkdownTransformPrompt,
  buildSummaryPrompt,
  buildTitlePrompt,
  buildTopicExtractionPrompt,
  TRANSCRIPTION_PROMPT,
} from "./prompts";

export type GeminiAudioPart =
  | {
      inlineData: { data: string; mimeType: string };
    }
  | {
      fileData: { fileUri: string; mimeType: string };
    };

// ===================================================================
// UTILITIES
// ===================================================================

/**
 * Extract speaker names from transcript
 */
function extractSpeakers(text: string): string[] {
  const speakerSet = new Set<string>();
  const lines = text.split("\n");
  lines.forEach((line) => {
    const match = line.match(/^([\w\s]+):/);
    if (match) {
      speakerSet.add(match[1].trim());
    }
  });
  return Array.from(speakerSet);
}

/**
 * Clean JSON response (removes markdown code blocks)
 */
function cleanJsonResponse(text: string): string {
  return text
    .trim()
    .replace(/^```(json)?\s*/, "")
    .replace(/\s*```$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown): string | null {
  if (value === undefined || value === null || value === "null") {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function normalizeActionItemInput(item: unknown): ActionItemInput | null {
  if (!isRecord(item)) return null;

  const description = normalizeString(item.description);
  if (!description || description.toLowerCase() === "no action items") {
    return null;
  }

  return {
    description: description.charAt(0).toUpperCase() + description.slice(1),
    assignee: normalizeNullableString(item?.assignee),
    due_date: normalizeNullableString(item?.due_date),
  };
}

function normalizeStatusUpdate(
  update: unknown,
  existingIds: Set<string>,
): ActionItemStatusUpdate | null {
  if (!isRecord(update)) return null;

  const id = normalizeString(update.id);
  if (!id || !existingIds.has(id)) return null;

  const status = normalizeString(update.status);
  if (status !== "completed" && status !== "pending") return null;

  return {
    id,
    description: normalizeString(update.description),
    status,
    reason: normalizeString(update.reason),
  };
}

function normalizeTopicNode(node: unknown): NodeInput | null {
  if (!isRecord(node)) return null;

  const rawId = normalizeString(node.id);
  const label = normalizeTopicLabel(node.label);
  if (!label) return null;

  return {
    id: normalizeTopicId(rawId, label),
    label,
    color: normalizeHexColor(node.color) || colorForLabel(label),
    emoji: normalizeEmoji(node.emoji, label),
  };
}

function normalizeTopicGraph(data: unknown): ConversationGraph {
  if (!isRecord(data)) return { nodes: [], edges: [] };

  const rawNodes = Array.isArray(data.nodes) ? data.nodes.filter(isRecord) : [];
  const rawToNormalizedId = new Map<string, string>();
  const seenLabels = new Set<string>();
  const nodes: NodeInput[] = [];

  for (const rawNode of rawNodes) {
    const rawId = normalizeString(rawNode.id);
    const node = normalizeTopicNode(rawNode);
    if (!node) continue;

    const labelKey = node.label.toLowerCase();
    if (seenLabels.has(labelKey)) {
      if (rawId) {
        const existing = nodes.find(
          (item) => item.label.toLowerCase() === labelKey,
        );
        if (existing) rawToNormalizedId.set(rawId, existing.id);
      }
      continue;
    }

    seenLabels.add(labelKey);
    nodes.push(node);
    if (rawId) rawToNormalizedId.set(rawId, node.id);
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const seenEdges = new Set<string>();

  const edges = Array.isArray(data.edges)
    ? data.edges
        .filter(isRecord)
        .map((edge) => ({
          source_topic_id:
            rawToNormalizedId.get(normalizeString(edge.source_topic_id)) ||
            normalizeString(edge.source_topic_id),
          target_topic_id:
            rawToNormalizedId.get(normalizeString(edge.target_topic_id)) ||
            normalizeString(edge.target_topic_id),
          color: normalizeHexColor(edge.color) || "#8A8F98",
        }))
        .filter((edge) => {
          const key = `${edge.source_topic_id}->${edge.target_topic_id}`;
          if (
            !edge.source_topic_id ||
            !edge.target_topic_id ||
            edge.source_topic_id === edge.target_topic_id ||
            !nodeIds.has(edge.source_topic_id) ||
            !nodeIds.has(edge.target_topic_id) ||
            seenEdges.has(key)
          ) {
            return false;
          }

          seenEdges.add(key);
          return true;
        })
    : [];

  return { nodes, edges };
}

function normalizeTopicLabel(value: unknown): string {
  return Array.from(normalizeString(value))
    .filter((char) => !isEmojiLikeCodepoint(char))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
}

function isEmojiLikeCodepoint(value: string): boolean {
  const codepoint = value.codePointAt(0) || 0;
  return (
    (codepoint >= 0x1f000 && codepoint <= 0x1faff) ||
    (codepoint >= 0x2600 && codepoint <= 0x27bf) ||
    codepoint === 0xfe0f ||
    codepoint === 0x200d
  );
}

function normalizeTopicId(rawId: string, label: string): string {
  const normalizedId = rawId.trim();
  if (normalizedId && !/^(node|topic)-?\d+$/i.test(normalizedId)) {
    return normalizedId;
  }

  return slugify(label) || crypto.randomUUID();
}

function normalizeHexColor(value: unknown): string {
  const color = normalizeString(value);
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "";
}

function normalizeEmoji(value: unknown, label: string): string {
  const emoji = normalizeString(value);
  if (emoji) return Array.from(emoji)[0] || fallbackEmoji(label);
  return fallbackEmoji(label);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function colorForLabel(label: string): string {
  const palette = [
    "#5B8DEF",
    "#52A37F",
    "#C47C48",
    "#B66AD9",
    "#D66B8F",
    "#6E9EAE",
    "#A9925A",
    "#7A83C2",
  ];
  const hash = Array.from(label).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return palette[hash % palette.length];
}

function fallbackEmoji(label: string): string {
  const normalized = label.toLowerCase();
  if (/(risk|warning|danger|issue|problem)/.test(normalized)) return "⚠️";
  if (/(idea|insight|concept|thinking)/.test(normalized)) return "💡";
  if (/(task|action|todo|plan)/.test(normalized)) return "✅";
  if (/(people|team|user|customer|public)/.test(normalized)) return "👥";
  if (/(science|lab|research|experiment|data)/.test(normalized)) return "🧪";
  if (/(money|cost|revenue|market)/.test(normalized)) return "💰";
  if (/(launch|deploy|release|ship)/.test(normalized)) return "🚀";
  return "🧠";
}

// ===================================================================
// AI SERVICE
// ===================================================================

export interface AIService {
  transcribeAudio(audioInput: GeminiAudioPart): Promise<TranscriptionResult>;
  generateTitle(transcript: string): Promise<string>;
  extractActionItems(
    input: string | GeminiAudioPart,
    speakers?: string[],
    existingActionItems?: ActionItem[],
  ): Promise<ActionItemInput[]>;
  checkActionItemStatus(
    input: string | GeminiAudioPart,
    existingActionItems: ActionItem[],
  ): Promise<ActionItemStatusUpdate[]>;
  extractTopics(
    text: string,
    existingNodes?: NodeInput[],
    existingEdges?: EdgeInput[],
  ): Promise<ConversationGraph>;
  generateSummary(text: string): Promise<string>;
  generateMarkdown(formatPrompt: string, text: string): Promise<string>;
}

/**
 * Create Gemini AI Service
 */
export function createGeminiService(model: any): AIService {
  return {
    // ===============================================================
    // TRANSCRIPTION
    // ===============================================================

    async transcribeAudio(
      audioInput: GeminiAudioPart,
    ): Promise<TranscriptionResult> {
      try {
        const result = await model.generateContent([
          TRANSCRIPTION_PROMPT,
          audioInput,
        ]);
        const transcriptText = result.response.text().trim();
        const speakers = extractSpeakers(transcriptText);
        return { text: transcriptText, speakers };
      } catch (error) {
        console.error("❌ Error transcribing audio:", error);
        throw new Error("Failed to transcribe audio with Gemini");
      }
    },

    // ===============================================================
    // TITLE GENERATION
    // ===============================================================

    async generateTitle(transcript: string): Promise<string> {
      try {
        const prompt = buildTitlePrompt(transcript);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
      } catch (error) {
        console.error("❌ Error generating title:", error);
        throw new Error("Failed to generate title with Gemini");
      }
    },

    // ===============================================================
    // ACTION ITEMS
    // ===============================================================

    async extractActionItems(
      input: string | GeminiAudioPart,
      speakers: string[] = [],
      existingActionItems: ActionItem[] = [],
    ): Promise<ActionItemInput[]> {
      try {
        const prompt = buildActionItemsPrompt(
          input,
          speakers,
          existingActionItems,
        );

        let result;
        if (typeof input !== "string") {
          result = await model.generateContent([prompt, input]);
        } else {
          result = await model.generateContent(prompt);
        }

        const text = result.response.text();
        const cleanedText = cleanJsonResponse(text);

        try {
          const actionItems = JSON.parse(cleanedText);
          if (!Array.isArray(actionItems)) {
            throw new Error("Action items response was not an array");
          }

          return actionItems
            .map((item: unknown) => normalizeActionItemInput(item))
            .filter((item): item is ActionItemInput => Boolean(item));
        } catch (e) {
          console.error("Error parsing action items JSON:", e);
          console.error("Raw text was:", text);
          throw new Error("Invalid action item response from Gemini");
        }
      } catch (error) {
        console.error("Error extracting action items:", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to extract action items");
      }
    },

    // ===============================================================
    // AI SELF-CHECKOFF (The Magic!)
    // ===============================================================

    async checkActionItemStatus(
      input: string | GeminiAudioPart,
      existingActionItems: ActionItem[],
    ): Promise<ActionItemStatusUpdate[]> {
      try {
        if (!existingActionItems || existingActionItems.length === 0) {
          return [];
        }

        const prompt = buildActionItemStatusPrompt(existingActionItems);

        let result;
        if (typeof input !== "string") {
          result = await model.generateContent([prompt, input]);
        } else {
          result = await model.generateContent(`${prompt}\n\nText: ${input}`);
        }

        const text = result.response.text();
        const cleanedText = cleanJsonResponse(text);

        if (cleanedText.trim() === "[]") {
          return [];
        }

        try {
          const parsed = JSON.parse(cleanedText);
          if (!Array.isArray(parsed)) {
            throw new Error("Action item status response was not an array");
          }

          const existingIds = new Set(
            existingActionItems.map((item) => item.id),
          );
          return parsed
            .map((update: unknown) =>
              normalizeStatusUpdate(update, existingIds),
            )
            .filter((update): update is ActionItemStatusUpdate =>
              Boolean(update),
            );
        } catch (e) {
          console.error("Error parsing action item status JSON:", e);
          console.error("Raw text was:", text);
          throw new Error("Invalid action item status response from Gemini");
        }
      } catch (error) {
        console.error("Error checking action item status:", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to check action item status");
      }
    },

    // ===============================================================
    // TOPIC/NODE EXTRACTION
    // ===============================================================

    async extractTopics(
      text: string,
      existingNodes: NodeInput[] = [],
      existingEdges: EdgeInput[] = [],
    ): Promise<ConversationGraph> {
      if (!text) return { nodes: [], edges: [] };

      try {
        const prompt = buildTopicExtractionPrompt(
          text,
          existingNodes,
          existingEdges,
        );
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonString = response.text();

        jsonString = cleanJsonResponse(jsonString);
        jsonString = jsonString.replace(/^.*?({.*}).*?$/, "$1");

        try {
          const data = JSON.parse(jsonString);
          return normalizeTopicGraph(data);
        } catch (e) {
          console.error("Error parsing JSON response", e, jsonString);
          return { nodes: [], edges: [] };
        }
      } catch (error) {
        console.error("Error extracting topics:", error);
        return { nodes: [], edges: [] };
      }
    },

    // ===============================================================
    // SUMMARY
    // ===============================================================

    async generateSummary(text: string): Promise<string> {
      try {
        const prompt = buildSummaryPrompt(text);
        const result = await model.generateContent(prompt);
        const response = await result.response.text();
        return response.trim();
      } catch (error) {
        console.error("Error generating summary:", error);
        throw new Error("Failed to generate summary with Gemini");
      }
    },

    // ===============================================================
    // EXPORT TRANSFORMATION
    // ===============================================================

    async generateMarkdown(
      formatPrompt: string,
      text: string,
    ): Promise<string> {
      try {
        const prompt = buildMarkdownTransformPrompt(formatPrompt, text);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
      } catch (error) {
        console.error("Error generating markdown:", error);
        throw new Error("Failed to generate markdown with Gemini");
      }
    },
  };
}
