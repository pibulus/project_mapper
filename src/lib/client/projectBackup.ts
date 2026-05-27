import type { ConversationData, ExportDraft } from "$lib/core/types";

const BACKUP_VERSION = 1;

interface ProjectBackupEnvelope {
  app: "project_mapper";
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  project: ConversationData;
}

export function downloadProjectBackup(project: ConversationData) {
  const backup: ProjectBackupEnvelope = {
    app: "project_mapper",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    project,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(project.title || "project")}.promapper.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function readProjectBackupFile(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const rawProject = parsed?.project || parsed;

  return normalizeImportedProject(rawProject);
}

function normalizeImportedProject(value: unknown): ConversationData {
  if (!isRecord(value)) {
    throw new Error("Backup file does not contain a project.");
  }

  const now = new Date().toISOString();
  const id = normalizeString(value.id) || crypto.randomUUID();
  const title = normalizeString(value.title) || "Imported Project";

  return {
    id,
    title,
    summary: normalizeString(value.summary),
    transcript: normalizeString(value.transcript),
    actionItems: Array.isArray(value.actionItems) ? value.actionItems : [],
    topics: Array.isArray(value.topics) ? value.topics : [],
    edges: Array.isArray(value.edges) ? value.edges : [],
    exportDrafts: normalizeExportDrafts(value.exportDrafts),
    syncEnabled: false,
    isPublic: false,
    createdAt: normalizeString(value.createdAt) || now,
    updatedAt: now,
    lastAnalysisWarnings: Array.isArray(value.lastAnalysisWarnings)
      ? value.lastAnalysisWarnings
      : [],
  };
}

function normalizeExportDrafts(value: unknown): ExportDraft[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((draft): draft is Record<string, unknown> => isRecord(draft))
    .map((draft) => ({
      id: normalizeString(draft.id) || crypto.randomUUID(),
      format: normalizeString(draft.format) || "CUSTOM",
      label: normalizeString(draft.label) || "Saved Draft",
      content: normalizeString(draft.content),
      prompt: normalizeString(draft.prompt) || undefined,
      createdAt: normalizeString(draft.createdAt) || new Date().toISOString(),
      updatedAt: normalizeString(draft.updatedAt) || new Date().toISOString(),
    }))
    .filter((draft) => draft.content);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "project"
  );
}
