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

  const id = normalizeString(node.id);
  const label = normalizeString(node.label);
  if (!id || !label) return null;

  return {
    id,
    label,
    color: normalizeString(node.color) || "#999999",
    emoji: normalizeString(node.emoji),
  };
}

function normalizeTopicGraph(data: unknown): ConversationGraph {
  if (!isRecord(data)) return { nodes: [], edges: [] };

  const nodes = Array.isArray(data.nodes)
    ? data.nodes
        .map((node) => normalizeTopicNode(node))
        .filter((node): node is NodeInput => Boolean(node))
    : [];
  const nodeIds = new Set(nodes.map((node) => node.id));

  const edges = Array.isArray(data.edges)
    ? data.edges
        .filter(isRecord)
        .map((edge) => ({
          source_topic_id: normalizeString(edge.source_topic_id),
          target_topic_id: normalizeString(edge.target_topic_id),
          color: normalizeString(edge.color) || "#999999",
        }))
        .filter(
          (edge) =>
            edge.source_topic_id &&
            edge.target_topic_id &&
            edge.source_topic_id !== edge.target_topic_id &&
            nodeIds.has(edge.source_topic_id) &&
            nodeIds.has(edge.target_topic_id),
        )
    : [];

  return { nodes, edges };
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
    ): Promise<ConversationGraph> {
      if (!text) return { nodes: [], edges: [] };

      try {
        const prompt = buildTopicExtractionPrompt(text, existingNodes);
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
