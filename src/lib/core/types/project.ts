import type { ActionItem } from "./action-item";
import type { Node } from "./node";
import type { Edge } from "./edge";

export interface ConversationData {
  id: string;
  title: string;
  summary: string;
  transcript: string;
  actionItems: ActionItem[];
  topics: Node[];
  edges: Edge[];
  syncEnabled: boolean;
}
