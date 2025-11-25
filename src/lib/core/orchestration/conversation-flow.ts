/**
 * Conversation Flow Orchestrator
 *
 * Main flow: Audio/Text → Transcription → Parallel AI Analysis → Data
 * This is the nervous system in action
 */

import type { AIService, GeminiAudioPart } from "../ai/gemini.ts";
import { analyzeAudio, analyzeText } from "./parallel-analysis.ts";
import type {
  ActionItem,
  Conversation,
  Edge,
  Node,
  NodeInput,
  Transcript,
} from "../types/index.ts";

export type AnalysisUpdateCallback = (type: string, data: any) => void;

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
): Promise<void> {
  const initialTranscript = {
    id: crypto.randomUUID(),
    conversation_id: conversationId,
    text,
    speakers,
    source: "text",
    created_at: new Date().toISOString(),
  };
  onUpdate?.("transcript", initialTranscript);

  // Parallel AI analysis, with streaming updates
  await analyzeText(
    aiService,
    text,
    speakers,
    existingActionItems,
    existingNodes,
    onUpdate,
  );

  // Generate title
  const title = await aiService.generateTitle(text);
  onUpdate?.("title", title);

  const conversation = {
    id: conversationId,
    title,
    source: "text",
    transcript: text,
  };
  onUpdate?.("conversation", conversation);
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
