/**
 * Parallel Analysis Coordinator
 *
 * The magic that makes conversation mapper fast:
 * - Topics, action items, and self-checkoff run simultaneously
 * - Efficient API usage
 * - Fast user experience
 */

import type { AIService, GeminiAudioPart } from "../ai/gemini.ts";
import type { AnalysisUpdateCallback } from "./conversation-flow.ts";
import type { ActionItem, NodeInput } from "../types/index.ts";

/**
 * Run parallel AI analysis on new text and stream results
 */
export async function analyzeText(
  aiService: AIService,
  text: string,
  speakers: string[] = [],
  existingActionItems: ActionItem[] = [],
  existingNodes: NodeInput[] = [],
  onUpdate?: AnalysisUpdateCallback,
): Promise<void> {
  // Run all AI operations, streaming results as they become available
  const topicsPromise = aiService
    .extractTopics(text, existingNodes)
    .then((topics) => {
      onUpdate?.("topics", topics);
      return topics;
    });

  const actionItemsPromise = aiService
    .extractActionItems(text, speakers, existingActionItems)
    .then((actionItems) => {
      onUpdate?.("action-items", actionItems);
      return actionItems;
    });

  const summaryPromise = aiService.generateSummary(text).then((summary) => {
    onUpdate?.("summary", summary);
    return summary;
  });

  // Wait for all analysis to complete
  const [topics, actionItems] = await Promise.all([
    topicsPromise,
    actionItemsPromise,
    summaryPromise,
  ]);

  // After topics and action items are extracted, check for status updates
  if (existingActionItems.length > 0) {
    aiService
      .checkActionItemStatus(text, existingActionItems)
      .then((statusUpdates) => {
        onUpdate?.("status-updates", statusUpdates);
      });
  }
}
