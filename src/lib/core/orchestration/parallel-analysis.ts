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
  warnings: AnalysisWarning[];
}

export interface AnalysisWarning {
  scope: "topics" | "action-items" | "summary" | "status-updates";
  message: string;
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
  const warnings: AnalysisWarning[] = [];

  const captureWarning = (
    scope: AnalysisWarning["scope"],
    error: unknown,
  ) => {
    const message =
      error instanceof Error ? error.message : `Unexpected ${scope} failure`;
    const warning = { scope, message };
    warnings.push(warning);
    onUpdate?.("analysis-warning", warning);
  };

  // Run all AI operations, streaming results as they become available
  const topicsPromise = aiService
    .extractTopics(text, existingNodes)
    .then((topics) => {
      onUpdate?.("topics", topics);
      return topics;
    })
    .catch((error) => {
      captureWarning("topics", error);
      return { nodes: [], edges: [] };
    });

  const actionItemsPromise = aiService
    .extractActionItems(text, speakers, existingActionItems)
    .then((actionItems) => {
      onUpdate?.("action-items", actionItems);
      return actionItems;
    })
    .catch((error) => {
      captureWarning("action-items", error);
      return [];
    });

  const summaryPromise = aiService.generateSummary(text).then((summary) => {
    onUpdate?.("summary", summary);
    return summary;
  }).catch((error) => {
    captureWarning("summary", error);
    return "";
  });

  const [topics, actionItems, summary] = await Promise.all([
    topicsPromise,
    actionItemsPromise,
    summaryPromise,
  ]);

  let statusUpdates: ActionItemStatusUpdate[] = [];
  if (existingActionItems.length > 0) {
    try {
      statusUpdates = await aiService.checkActionItemStatus(
        text,
        existingActionItems,
      );
      if (statusUpdates.length > 0) {
        onUpdate?.("status-updates", statusUpdates);
      }
    } catch (error) {
      captureWarning("status-updates", error);
    }
  }

  return {
    topics,
    actionItems,
    summary,
    statusUpdates,
    warnings,
  };
}
