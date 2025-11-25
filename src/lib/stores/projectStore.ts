/**
 * Project Store - Client-Side State Management
 *
 * Manages current project state with automatic sync to Supabase
 * Combines localStorage (fast, offline) with Supabase (persistent, collaborative)
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { ConversationData } from '$lib/core/types';
import { supabase, isSupabaseConfigured } from '$lib/supabaseClient';

const STORAGE_KEY = 'promap_current_project';

/**
 * Current project data
 */
export const currentProject = writable<ConversationData | null>(null);

/**
 * Project loading state
 */
export const isLoading = writable(false);

/**
 * Project save status
 */
export const saveStatus = writable<'saved' | 'saving' | 'error'>('saved');

/**
 * Load project from localStorage (instant, offline-first)
 */
export function loadFromLocalStorage() {
	if (!browser) return null;

	try {
		const data = localStorage.getItem(STORAGE_KEY);
		if (data) {
			const project = JSON.parse(data);
			currentProject.set(project);
			return project;
		}
	} catch (error) {
		console.error('[ProjectStore] Error loading from localStorage:', error);
	}

	return null;
}

/**
 * Save project to localStorage (instant backup)
 */
export function saveToLocalStorage(project: ConversationData) {
	if (!browser) return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
	} catch (error) {
		console.error('[ProjectStore] Error saving to localStorage:', error);
	}
}

/**
 * Save project to Supabase (persistent, collaborative)
 */
export async function saveToSupabase(project: ConversationData): Promise<boolean> {
	if (!project.syncEnabled) {
		console.log('[ProjectStore] Sync not enabled, skipping cloud save');
		return true; // Not an error, just a skipped operation
	}

	if (!isSupabaseConfigured()) {
		console.warn('[ProjectStore] Supabase not configured, skipping cloud save');
		return false;
	}

	saveStatus.set('saving');

	try {
		const { data, error } = await supabase
			.from('projects')
			.upsert({
				id: project.id,
				title: project.title || 'Untitled Project',
				summary: project.summary,
				transcript: project.transcript,
				action_items: project.actionItems || [],
				topics: project.topics || [],
				edges: project.edges || [],
				updated_at: new Date().toISOString()
			})
			.select()
			.single();

		if (error) {
			console.error('[ProjectStore] Supabase save error:', error);
			saveStatus.set('error');
			return false;
		}

		console.log('[ProjectStore] ✅ Saved to Supabase');
		saveStatus.set('saved');
		return true;
	} catch (error) {
		console.error('[ProjectStore] Error saving to Supabase:', error);
		saveStatus.set('error');
		return false;
	}
}

/**
 * Load project from Supabase by ID
 */
export async function loadFromSupabase(projectId: string): Promise<ConversationData | null> {
	if (!isSupabaseConfigured()) {
		console.warn('[ProjectStore] Supabase not configured');
		return null;
	}

	isLoading.set(true);

	try {
		const { data, error } = await supabase
			.from('projects')
			.select('*')
			.eq('id', projectId)
			.single();

		if (error) {
			console.error('[ProjectStore] Supabase load error:', error);
			return null;
		}

		// Transform database format to app format
		const project: ConversationData = {
			id: data.id,
			title: data.title,
			summary: data.summary,
			transcript: data.transcript || '',
			actionItems: data.action_items || [],
			topics: data.topics || [],
			edges: data.edges || []
		};

		currentProject.set(project);
		saveToLocalStorage(project); // Cache locally
		console.log('[ProjectStore] ✅ Loaded from Supabase');

		return project;
	} catch (error) {
		console.error('[ProjectStore] Error loading from Supabase:', error);
		return null;
	} finally {
		isLoading.set(false);
	}
}

/**
 * Create a new project locally
 */
export function startNewProject(initialData: Partial<ConversationData>): ConversationData {
	const project: ConversationData = {
		id: crypto.randomUUID(),
		title: initialData.title || 'Processing...',
		summary: initialData.summary || '',
		transcript: initialData.transcript || '',
		actionItems: [],
		topics: [],
		edges: [],
		syncEnabled: false // Default to local-only
	};

	currentProject.set(project);
	saveToLocalStorage(project);

	console.log('[ProjectStore] ✨ Started new local project', project.id);
	return project;
}

/**
 * Upgrade a local project to be synced with Supabase
 */
export async function enableSync(project: ConversationData) {
	console.log(`[ProjectStore] 🚀 Enabling sync for project ${project.id}`);
	const syncedProject = { ...project, syncEnabled: true };

	// Perform the first save to Supabase
	const success = await saveToSupabase(syncedProject);

	if (success) {
		// Update the local state to reflect sync is enabled
		updateProject({ syncEnabled: true });
		console.log(`[ProjectStore] ✅ Sync enabled for project ${project.id}`);
	} else {
		console.error(`[ProjectStore] ❌ Failed to enable sync for project ${project.id}`);
	}
}

/**
 * Update current project
 */
export function updateProject(updates: Partial<ConversationData>) {
	const current = get(currentProject);
	if (!current) return;

	const updated = { ...current, ...updates };
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

// Auto-load from localStorage on mount
if (browser) {
	loadFromLocalStorage();
}
