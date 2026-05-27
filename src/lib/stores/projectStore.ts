/**
 * Project Store - Client-Side State Management
 *
 * Manages current project state with automatic sync to Supabase
 * Combines localStorage (fast, offline) with Supabase (persistent, collaborative)
 */

import { writable, get } from "svelte/store";
import { browser } from "$app/environment";
import type { ConversationData } from "$lib/core/types";
import { supabase, isSupabaseConfigured } from "$lib/supabaseClient";

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

function nowIso() {
  return new Date().toISOString();
}

function projectStorageKey(projectId: string) {
  return `${PROJECT_STORAGE_PREFIX}${projectId}`;
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
    syncEnabled: project.syncEnabled === true,
    isPublic: project.isPublic === true,
    createdAt: project.createdAt || now,
    updatedAt: project.updatedAt || now,
    lastAnalysisWarnings: project.lastAnalysisWarnings || [],
  };
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
        })),
    );
  } catch (error) {
    console.error("[ProjectStore] Error reading project index:", error);
    return [];
  }
}

function writeProjectIndex(projects: LocalProjectSummary[]) {
  if (!browser) return;

  const sorted = sortProjectSummaries(projects);
  localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(sorted));
  localProjects.set(sorted);
}

function upsertProjectIndex(project: ConversationData) {
  const index = readProjectIndex();
  const summary = summaryFromProject(project);
  const withoutProject = index.filter((item) => item.id !== project.id);
  writeProjectIndex([summary, ...withoutProject]);
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
  if (!browser) return;

  try {
    const normalized = normalizeProject(project);
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, normalized.id);
    localStorage.setItem(
      projectStorageKey(normalized.id),
      JSON.stringify(normalized),
    );
    upsertProjectIndex(normalized);
  } catch (error) {
    console.error("[ProjectStore] Error saving to localStorage:", error);
  }
}

export function loadLocalProject(projectId: string) {
  if (!browser) return null;

  try {
    const raw = localStorage.getItem(projectStorageKey(projectId));
    if (!raw) return null;

    const project = normalizeProject(JSON.parse(raw));
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, project.id);
    currentProject.set(project);
    refreshLocalProjects();
    return project;
  } catch (error) {
    console.error("[ProjectStore] Error loading local project:", error);
    return null;
  }
}

export function deleteLocalProject(projectId: string) {
  if (!browser) return;

  localStorage.removeItem(projectStorageKey(projectId));
  const index = readProjectIndex().filter(
    (project) => project.id !== projectId,
  );
  writeProjectIndex(index);

  if (localStorage.getItem(CURRENT_PROJECT_ID_KEY) === projectId) {
    localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
    currentProject.set(null);
  }
}

export function setCurrentProject(project: ConversationData | null) {
  if (!browser) {
    currentProject.set(project);
    return;
  }

  if (!project) {
    localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
    currentProject.set(null);
    refreshLocalProjects();
    return;
  }

  const normalized = normalizeProject(project);
  localStorage.setItem(CURRENT_PROJECT_ID_KEY, normalized.id);
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
    const { error } = await supabase
      .from("projects")
      .upsert({
        id: project.id,
        title: project.title || "Untitled Project",
        summary: project.summary,
        transcript: project.transcript,
        action_items: project.actionItems || [],
        topics: project.topics || [],
        edges: project.edges || [],
        is_public: project.isPublic === true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

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
      syncEnabled: true, // If loaded from Supabase, it's synced
      isPublic: data.is_public === true,
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

/**
 * Update current project
 */
export function updateProject(updates: Partial<ConversationData>) {
  const current = get(currentProject);
  if (!current) return;

  const updated = {
    ...current,
    ...updates,
    updatedAt: nowIso(),
  };
  currentProject.set(updated);
  saveToLocalStorage(updated);

  // Debounced cloud save
  debounceCloudSave(updated);
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
