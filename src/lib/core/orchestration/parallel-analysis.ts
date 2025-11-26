/**
 * Parallel Analysis Coordinator
 *
 * The magic that makes conversation mapper fast:
 * - Topics, action items, and self-checkoff run simultaneously
 * - Efficient API usage
 * - Fast user experience
 */

import type { AIService } from "../ai/gemini.ts";
import type { AnalysisUpdateCallback } from "./conversation-flow.ts";
import type {
  ActionItem,
  ActionItemInput,
  ActionItemStatusUpdate,
  ConversationGraph,
  NodeInput,
} from "../types/index.ts";

export interface AnalysisResult {
  topics: ConversationGraph;
  actionItems: ActionItemInput[];
  summary: string;
  statusUpdates: ActionItemStatusUpdate[];
}

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
): Promise<AnalysisResult> {
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

  const [topics, actionItems, summary] = await Promise.all([
    topicsPromise,
    actionItemsPromise,
    summaryPromise,
  ]);

  let statusUpdates: ActionItemStatusUpdate[] = [];
  if (existingActionItems.length > 0) {
    statusUpdates = await aiService.checkActionItemStatus(
      text,
      existingActionItems,
    );
    if (statusUpdates.length > 0) {
      onUpdate?.("status-updates", statusUpdates);
    }
  }

  return {
    topics,
    actionItems,
    summary,
    statusUpdates,
  };
}
