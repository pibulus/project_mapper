import type { ActionItem } from "./action-item";
import type { Node } from "./node";
import type { Edge } from "./edge";

export interface ExportDraft {
  id: string;
  format: string;
  label: string;
  content: string;
  prompt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationData {
  id: string;
  title: string;
  summary: string;
  transcript: string;
  actionItems: ActionItem[];
  topics: Node[];
  edges: Edge[];
  exportDrafts?: ExportDraft[];
  syncEnabled: boolean;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastAnalysisWarnings?: Array<{
    scope: string;
    message: string;
  }>;
}
