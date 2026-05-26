/**
 * Conversation Flow Orchestrator
 *
 * Main flow: Audio/Text → Transcription → Parallel AI Analysis → Data
 * This is the nervous system in action
 */

import type { AIService } from "../ai/gemini";
import {
  analyzeText,
  type AnalysisResult,
  type AnalysisWarning,
} from "./parallel-analysis";
import type {
  ActionItem,
  ActionItemInput,
  ActionItemStatusUpdate,
  Conversation,
  ConversationGraph,
  NodeInput,
  Transcript,
} from "../types/index";

export type AnalysisUpdateCallback = (type: string, data: any) => void;

export interface ProcessTextResult {
  transcript: Transcript;
  conversation: Conversation;
  topics: ConversationGraph;
  actionItems: ActionItemInput[];
  summary: string;
  statusUpdates: ActionItemStatusUpdate[];
  warnings: AnalysisWarning[];
}

/**
 * Process new text input and stream results
 */
export async function processText(
  aiService: AIService,
  text: string,
  conversationId: string,
  speakers: string[] = [],
  existingActionItems: ActionItem[] = [],
  existingNodes: NodeInput[] = [],
  onUpdate?: AnalysisUpdateCallback,
): Promise<ProcessTextResult> {
  const initialTranscript: Transcript = {
    id: crypto.randomUUID(),
    conversation_id: conversationId,
    text,
    speakers,
    source: "text",
    created_at: new Date().toISOString(),
  };
  onUpdate?.("transcript", initialTranscript);

  // Parallel AI analysis, with streaming updates
  const analysis: AnalysisResult = await analyzeText(
    aiService,
    text,
    speakers,
    existingActionItems,
    existingNodes,
    onUpdate,
  );

  // Generate title
  let title = fallbackTitle(text);
  try {
    title = await aiService.generateTitle(text);
  } catch (error) {
    console.warn("[ConversationFlow] Falling back to local title", error);
  }
  onUpdate?.("title", title);

  const conversation: Conversation = {
    id: conversationId,
    title,
    source: "text",
    transcript: text,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  onUpdate?.("conversation", conversation);

  return {
    transcript: initialTranscript,
    conversation,
    topics: analysis.topics,
    actionItems: analysis.actionItems,
    summary: analysis.summary,
    statusUpdates: analysis.statusUpdates,
    warnings: analysis.warnings,
  };
}

function fallbackTitle(text: string): string {
  const words = text
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);

  if (!words.length) return "Mapped Conversation";

  return words.join(" ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Generate summary for conversation
 */
export async function generateSummary(
  aiService: AIService,
  text: string,
): Promise<string> {
  return aiService.generateSummary(text);
}

/**
 * Export conversation in different formats
 */
export async function exportConversation(
  aiService: AIService,
  formatPrompt: string,
  text: string,
): Promise<string> {
  return aiService.generateMarkdown(formatPrompt, text);
}
