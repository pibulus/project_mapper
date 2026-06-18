/**
 * Project Store - Client-Side State Management
 *
 * Manages current project state with automatic sync to Supabase
 * Combines localStorage (fast, offline) with Supabase (persistent, collaborative)
 */

import { writable, get } from "svelte/store";
import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";
import type { ConversationData } from "$lib/core/types";
import { supabase, isSupabaseConfigured } from "$lib/supabaseClient";

const PUBLIC_PARTYKIT_HOST = env.PUBLIC_PARTYKIT_HOST || "";

const LEGACY_STORAGE_KEY = "promap_current_project";
const CURRENT_PROJECT_ID_KEY = "promap_current_project_id";
const PROJECT_INDEX_KEY = "promap_projects_index";
const PROJECT_STORAGE_PREFIX = "promap_project:";

export interface LocalProjectSummary {
  id: string;
  title: string;
  summary: string;
  updatedAt: string;
  createdAt: string;
  syncEnabled: boolean;
  isPublic: boolean;
  isStarred?: boolean;
}

/**
 * Current project data
 */
export const currentProject = writable<ConversationData | null>(null);

/**
 * Browser-local project index used by the home screen.
 */
export const localProjects = writable<LocalProjectSummary[]>([]);

/**
 * Project loading state
 */
export const isLoading = writable(false);

/**
 * Project save status
 */
export const saveStatus = writable<"saved" | "saving" | "error">("saved");

/**
 * Last browser-local persistence problem, shown so users know refresh may lose
 * the in-memory project.
 */
export const localSaveError = writable("");

const LOCAL_SAVE_FAILURE_MESSAGE =
  "Local browser save failed. Download a backup before refreshing.";

function nowIso() {
  return new Date().toISOString();
}

function projectStorageKey(projectId: string) {
  return `${PROJECT_STORAGE_PREFIX}${projectId}`;
}

function clearLocalSaveFailure() {
  localSaveError.set("");
}

function reportLocalSaveFailure(context: string, error: unknown) {
  console.error(`[ProjectStore] ${context}:`, error);
  localSaveError.set(LOCAL_SAVE_FAILURE_MESSAGE);
  saveStatus.set("error");
}

function normalizeProject(project: ConversationData): ConversationData {
  const now = nowIso();

  return {
    ...project,
    title: project.title || "Untitled Project",
    summary: project.summary || "",
    transcript: project.transcript || "",
    actionItems: project.actionItems || [],
    topics: project.topics || [],
    edges: project.edges || [],
    exportDrafts: normalizeExportDrafts(project.exportDrafts),
    syncEnabled: project.syncEnabled === true,
    isPublic: project.isPublic === true,
    isStarred: project.isStarred === true,
    createdAt: project.createdAt || now,
    updatedAt: project.updatedAt || now,
    lastAnalysisWarnings: project.lastAnalysisWarnings || [],
  };
}

function normalizeExportDrafts(
  drafts: ConversationData["exportDrafts"],
): NonNullable<ConversationData["exportDrafts"]> {
  if (!Array.isArray(drafts)) return [];

  return drafts
    .filter((draft) => {
      return (
        draft &&
        typeof draft.id === "string" &&
        typeof draft.content === "string" &&
        draft.content.trim()
      );
    })
    .map((draft) => ({
      id: draft.id,
      format: draft.format || "CUSTOM",
      label: draft.label || "Saved Draft",
      content: draft.content,
      prompt: draft.prompt || undefined,
      createdAt: draft.createdAt || draft.updatedAt || nowIso(),
      updatedAt: draft.updatedAt || draft.createdAt || nowIso(),
    }));
}

function summaryFromProject(project: ConversationData): LocalProjectSummary {
  return {
    id: project.id,
    title: project.title || "Untitled Project",
    summary: project.summary || "",
    updatedAt: project.updatedAt || nowIso(),
    createdAt: project.createdAt || project.updatedAt || nowIso(),
    syncEnabled: project.syncEnabled === true,
    isPublic: project.isPublic === true,
    isStarred: project.isStarred === true,
  };
}

function sortProjectSummaries(projects: LocalProjectSummary[]) {
  return [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function readProjectIndex(): LocalProjectSummary[] {
  if (!browser) return [];

  try {
    const raw = localStorage.getItem(PROJECT_INDEX_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return sortProjectSummaries(
      parsed
        .filter((item): item is LocalProjectSummary => {
          return (
            item &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            typeof item.updatedAt === "string"
          );
        })
        .map((item) => ({
          id: item.id,
          title: item.title || "Untitled Project",
          summary: item.summary || "",
          updatedAt: item.updatedAt,
          createdAt: item.createdAt || item.updatedAt,
          syncEnabled: item.syncEnabled === true,
          isPublic: item.isPublic === true,
          isStarred: item.isStarred === true,
        })),
    );
  } catch (error) {
    console.error("[ProjectStore] Error reading project index:", error);
    return [];
  }
}

function writeProjectIndex(projects: LocalProjectSummary[]) {
  if (!browser) return true;

  try {
    const sorted = sortProjectSummaries(projects);
    localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(sorted));
    localProjects.set(sorted);
    return true;
  } catch (error) {
    reportLocalSaveFailure("Error saving project index", error);
    return false;
  }
}

function upsertProjectIndex(project: ConversationData) {
  const index = readProjectIndex();
  const summary = summaryFromProject(project);
  const withoutProject = index.filter((item) => item.id !== project.id);
  return writeProjectIndex([summary, ...withoutProject]);
}

export function refreshLocalProjects() {
  const projects = readProjectIndex();
  localProjects.set(projects);
  return projects;
}

/**
 * Load project from localStorage (instant, offline-first)
 */
export function loadFromLocalStorage() {
  if (!browser) return null;

  try {
    refreshLocalProjects();

    const currentProjectId = localStorage.getItem(CURRENT_PROJECT_ID_KEY);
    if (currentProjectId) {
      const project = loadLocalProject(currentProjectId);
      if (project) return project;
      localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
    }

    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyData) {
      const project = normalizeProject(JSON.parse(legacyData));
      setCurrentProject(project);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return project;
    }
  } catch (error) {
    console.error("[ProjectStore] Error loading from localStorage:", error);
  }

  return null;
}

/**
 * Save project to localStorage (instant backup)
 */
export function saveToLocalStorage(project: ConversationData) {
  if (!browser) return true;

  try {
    const normalized = normalizeProject(project);
    localStorage.setItem(
      projectStorageKey(normalized.id),
      JSON.stringify(normalized),
    );

    if (!upsertProjectIndex(normalized)) return false;

    localStorage.setItem(CURRENT_PROJECT_ID_KEY, normalized.id);
    clearLocalSaveFailure();
    return true;
  } catch (error) {
    reportLocalSaveFailure("Error saving to localStorage", error);
    return false;
  }
}

export function loadLocalProject(projectId: string) {
  if (!browser) return null;

  try {
    const raw = localStorage.getItem(projectStorageKey(projectId));
    if (!raw) return null;

    const project = normalizeProject(JSON.parse(raw));
    currentProject.set(project);
    try {
      localStorage.setItem(CURRENT_PROJECT_ID_KEY, project.id);
      clearLocalSaveFailure();
    } catch (error) {
      reportLocalSaveFailure("Error selecting local project", error);
    }
    refreshLocalProjects();
    return project;
  } catch (error) {
    console.error("[ProjectStore] Error loading local project:", error);
    return null;
  }
}

export function deleteLocalProject(projectId: string) {
  if (!browser) return;

  try {
    const wasCurrent =
      localStorage.getItem(CURRENT_PROJECT_ID_KEY) === projectId;
    localStorage.removeItem(projectStorageKey(projectId));
    const index = readProjectIndex().filter(
      (project) => project.id !== projectId,
    );
    if (!writeProjectIndex(index)) return;

    if (wasCurrent) {
      localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
      currentProject.set(null);
      clearLocalSaveFailure();
    }
  } catch (error) {
    reportLocalSaveFailure("Error deleting local project", error);
  }
}

export function setCurrentProject(project: ConversationData | null) {
  if (!browser) {
    currentProject.set(project);
    return;
  }

  if (!project) {
    try {
      localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
      clearLocalSaveFailure();
    } catch (error) {
      reportLocalSaveFailure("Error clearing current project", error);
    }
    currentProject.set(null);
    refreshLocalProjects();
    return;
  }

  const normalized = normalizeProject(project);
  currentProject.set(normalized);
  saveToLocalStorage(normalized);
}

export function clearCurrentProject() {
  setCurrentProject(null);
}

/**
 * Save project to Supabase (persistent, collaborative)
 */
export async function saveToSupabase(
  project: ConversationData,
): Promise<boolean> {
  if (!project.syncEnabled) {
    return true; // Not an error, just a skipped operation
  }

  if (!isSupabaseConfigured()) {
    console.warn("[ProjectStore] Supabase not configured, skipping cloud save");
    saveStatus.set("error");
    return false;
  }

  saveStatus.set("saving");

  try {
    const payload = {
      id: project.id,
      title: project.title || "Untitled Project",
      summary: project.summary,
      transcript: project.transcript,
      action_items: project.actionItems || [],
      topics: project.topics || [],
      edges: project.edges || [],
      export_drafts: project.exportDrafts || [],
      is_public: project.isPublic === true,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from("projects")
      .upsert(payload)
      .select()
      .single();

    if (error && isMissingExportDraftsColumn(error)) {
      const { export_drafts: _exportDrafts, ...fallbackPayload } = payload;
      const fallback = await supabase
        .from("projects")
        .upsert(fallbackPayload)
        .select()
        .single();
      error = fallback.error;
    }

    if (error) {
      console.error("[ProjectStore] Supabase save error:", error);
      saveStatus.set("error");
      return false;
    }

    saveStatus.set("saved");
    return true;
  } catch (error) {
    console.error("[ProjectStore] Error saving to Supabase:", error);
    saveStatus.set("error");
    return false;
  }
}

function isMissingExportDraftsColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message) : "";
  const details = "details" in error ? String(error.details) : "";
  const code = "code" in error ? String(error.code) : "";
  return (
    code === "PGRST204" ||
    message.includes("export_drafts") ||
    details.includes("export_drafts")
  );
}

/**
 * Load project from Supabase by ID
 */
export async function loadFromSupabase(
  projectId: string,
): Promise<ConversationData | null> {
  if (!isSupabaseConfigured()) {
    console.warn("[ProjectStore] Supabase not configured");
    return null;
  }

  isLoading.set(true);

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error) {
      console.error("[ProjectStore] Supabase load error:", error);
      return null;
    }

    // Transform database format to app format
    const project: ConversationData = {
      id: data.id,
      title: data.title,
      summary: data.summary,
      transcript: data.transcript || "",
      actionItems: data.action_items || [],
      topics: data.topics || [],
      edges: data.edges || [],
      exportDrafts: normalizeExportDrafts(data.export_drafts),
      syncEnabled: true, // If loaded from Supabase, it's synced
      isPublic: data.is_public === true,
      isStarred: false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastAnalysisWarnings: [],
    };

    currentProject.set(project);
    saveToLocalStorage(project); // Cache locally

    return project;
  } catch (error) {
    console.error("[ProjectStore] Error loading from Supabase:", error);
    return null;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Load project from PartyKit Durable Storage
 */
export async function loadFromPartyKit(
  projectId: string,
): Promise<ConversationData | null> {
  if (!PUBLIC_PARTYKIT_HOST) {
    console.warn(
      "[ProjectStore] PartyKit host not configured, skipping HTTP fetch",
    );
    return null;
  }

  isLoading.set(true);

  try {
    const host = PUBLIC_PARTYKIT_HOST.replace(/\/$/, "");
    const url = `${host}/parties/project/${projectId}`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status !== 404) {
        console.warn(
          `[ProjectStore] PartyKit load error: ${response.status} ${response.statusText}`,
        );
      }
      return null;
    }

    const data = await response.json();
    const project = normalizeProject({
      ...data,
      syncEnabled: true,
    });

    currentProject.set(project);
    saveToLocalStorage(project); // Cache locally
    refreshLocalProjects();
    return project;
  } catch (error) {
    console.error("[ProjectStore] Error loading from PartyKit:", error);
    return null;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Create a new project locally
 */
export function startNewProject(
  initialData: Partial<ConversationData>,
): ConversationData {
  const now = nowIso();
  const project: ConversationData = {
    id: initialData.id || crypto.randomUUID(),
    title: initialData.title || "Processing...",
    summary: initialData.summary || "",
    transcript: initialData.transcript || "",
    actionItems: initialData.actionItems || [],
    topics: initialData.topics || [],
    edges: initialData.edges || [],
    exportDrafts: normalizeExportDrafts(initialData.exportDrafts),
    syncEnabled: initialData.syncEnabled === true,
    isPublic: initialData.isPublic === true,
    createdAt: initialData.createdAt || now,
    updatedAt: initialData.updatedAt || now,
    lastAnalysisWarnings: initialData.lastAnalysisWarnings || [],
  };

  setCurrentProject(project);

  return project;
}

/**
 * Upgrade a local project to be synced with Supabase
 */
export async function enableSync(
  project: ConversationData,
  options: { isPublic?: boolean } = {},
): Promise<boolean> {
  const syncedProject = {
    ...project,
    syncEnabled: true,
    isPublic: options.isPublic ?? project.isPublic === true,
  };

  // Perform the first save to Supabase
  const success = await saveToSupabase(syncedProject);

  if (success) {
    setCurrentProject(syncedProject);
  } else {
    console.error(
      `[ProjectStore] ❌ Failed to enable sync for project ${project.id}`,
    );
  }

  return success;
}

export type ProjectUpdateListener = (
  updates: Partial<ConversationData>,
) => void;
let projectUpdateListener: ProjectUpdateListener | null = null;

export function registerProjectUpdateListener(
  listener: ProjectUpdateListener | null,
) {
  projectUpdateListener = listener;
}

/**
 * Update current project
 */
export function updateProject(
  updates: Partial<ConversationData>,
  origin: "local" | "remote" = "local",
) {
  const current = get(currentProject);
  if (!current) return;

  const updated = {
    ...current,
    ...updates,
    updatedAt: nowIso(),
  };
  currentProject.set(updated);
  saveToLocalStorage(updated);

  if (origin === "local") {
    if (projectUpdateListener) {
      try {
        projectUpdateListener(updates);
      } catch (err) {
        console.error("[ProjectStore] Error in project update listener:", err);
      }
    }

    // Debounced cloud save
    debounceCloudSave(updated);
  }
}

// Debounce cloud saves (don't spam Supabase)
let cloudSaveTimeout: NodeJS.Timeout | null = null;
function debounceCloudSave(project: ConversationData) {
  if (cloudSaveTimeout) {
    clearTimeout(cloudSaveTimeout);
  }

  cloudSaveTimeout = setTimeout(() => {
    saveToSupabase(project);
  }, 2000); // Save 2s after last update
}

if (browser) {
  refreshLocalProjects();
}
