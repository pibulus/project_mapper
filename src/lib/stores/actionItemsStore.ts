/**
 * Action Items Store
 *
 * A dedicated store for managing the state of action items for a project.
 * This encapsulates the business logic for action items and prepares
 * the feature for future real-time collaboration.
 */

import { writable, get } from "svelte/store";
import { currentProject, updateProject } from "./projectStore";
import type { ActionItem } from "$lib/core/types";

export const actionItems = writable<ActionItem[]>([]);

// Sync the store with the main project store
currentProject.subscribe((project) => {
  if (project && project.actionItems) {
    // Basic check to prevent loops if the store is the one that triggered the update
    if (
      JSON.stringify(get(actionItems)) !== JSON.stringify(project.actionItems)
    ) {
      actionItems.set(project.actionItems);
    }
  } else {
    actionItems.set([]);
  }
});

function _updateProject(newActionItems: ActionItem[]) {
  // Sort by the sort_order before saving to the main store
  const sorted = newActionItems.sort((a, b) => a.sort_order - b.sort_order);
  updateProject({ actionItems: sorted });
}

// --- Public API for the store ---

export function toggleItem(itemId: string) {
  const currentItems = get(actionItems);
  const updated = currentItems.map((i) =>
    i.id === itemId
      ? { ...i, status: i.status === "completed" ? "pending" : "completed" }
      : i,
  );
  _updateProject(updated);
}

export function deleteItem(itemId: string) {
  const currentItems = get(actionItems);
  const updated = currentItems.filter((i) => i.id !== itemId);
  _updateProject(updated);
}

export function addItem(description: string) {
  if (!description.trim()) return;
  const currentItems = get(actionItems);

  const newSortOrder =
    currentItems.length > 0
      ? Math.min(...currentItems.map((i) => i.sort_order)) - 10
      : 0;

  const newItem: ActionItem = {
    id: crypto.randomUUID(),
    description: description.trim(),
    status: "pending",
    assignee: "",
    due_date: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sort_order: newSortOrder,
    conversation_id: get(currentProject)?.id || "",
  };

  _updateProject([newItem, ...currentItems]);
}

export function updateItem(itemId: string, updates: Partial<ActionItem>) {
  const currentItems = get(actionItems);
  const updated = currentItems.map((i) =>
    i.id === itemId
      ? { ...i, ...updates, updated_at: new Date().toISOString() }
      : i,
  );
  _updateProject(updated);
}

export function reorderItems(newItems: ActionItem[]) {
  // Update sort order based on new array index for persistence
  const updatedWithSortOrder = newItems.map((item, index) => ({
    ...item,
    sort_order: index,
  }));
  _updateProject(updatedWithSortOrder);
}
