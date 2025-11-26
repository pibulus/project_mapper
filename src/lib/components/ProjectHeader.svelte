<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import AppendButton from './AppendButton.svelte';
	import { updateProject } from '$lib/stores/projectStore';
	import type { ConversationData } from '$lib/core/types/project';

	export let project: ConversationData | null = null;

	const dispatch = createEventDispatcher<{
		back: void;
		export: void;
	}>();

	let isEditingTitle = false;
	let titleInput = project?.title || '';
	let isSavingTitle = false;
	let isRegenerating = false;
	let titleError = '';

	$: titleInput = project?.title || titleInput;

	function beginEdit() {
		if (!project) return;
		titleInput = project.title || '';
		isEditingTitle = true;
		titleError = '';
	}

	function cancelEdit() {
		isEditingTitle = false;
		titleInput = project?.title || '';
		titleError = '';
	}

	async function saveTitle() {
		if (!project) return;
		const trimmed = titleInput.trim();
		if (!trimmed) {
			titleError = 'Title cannot be empty';
			return;
		}
		if (trimmed === project.title) {
			isEditingTitle = false;
			return;
		}
		isSavingTitle = true;
		updateProject({ title: trimmed });
		isSavingTitle = false;
		isEditingTitle = false;
	}

	async function regenerateTitle() {
		if (!project?.transcript) {
			titleError = 'Need a transcript before generating a title';
			return;
		}
		try {
			isRegenerating = true;
			titleError = '';
			const response = await fetch('/api/title', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ transcript: project.transcript })
			});
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || 'Failed to generate title');
			}
			const data = await response.json();
			if (data?.title) {
				updateProject({ title: data.title });
			}
		} catch (err: any) {
			console.error(err);
			titleError = err?.message || 'Unable to generate title';
		} finally {
			isRegenerating = false;
		}
	}
</script>

{#if project}
	<header class="project-header">
		<div class="header-left">
			<button class="back-btn" on:click={() => dispatch('back')} aria-label="Back to home">
				←
			</button>
			<div class="title-stack">
				{#if isEditingTitle}
					<div class="title-edit">
						<input
							class="title-input"
							type="text"
							bind:value={titleInput}
							maxlength="120"
							placeholder="Project title"
						/>
						<div class="edit-actions">
							<button class="pill-btn" on:click={cancelEdit} type="button">Cancel</button>
							<button
								class="pill-btn pill-solid"
								on:click={saveTitle}
								type="button"
								disabled={isSavingTitle}
							>
								{isSavingTitle ? 'Saving...' : 'Save'}
							</button>
						</div>
					</div>
				{:else}
					<div class="title-display">
						<h1>{project.title || 'Untitled Project'}</h1>
						<button class="ghost-btn" on:click={beginEdit} type="button">Rename</button>
						<button
							class="ghost-btn"
							on:click={regenerateTitle}
							type="button"
							disabled={isRegenerating}
						>
							{isRegenerating ? 'Generating…' : 'AI Title'}
						</button>
					</div>
				{/if}
				{#if titleError}
					<p class="title-error">{titleError}</p>
				{/if}
			</div>
		</div>
		<div class="header-right">
			<div class="sync-status" title={project.syncEnabled ? 'Synced to Cloud' : 'Local Only'}>
				{#if project.syncEnabled}
					<span class="status-dot success"></span>
					<span class="status-text">Synced</span>
				{:else}
					<span class="status-dot local"></span>
					<span class="status-text">Local</span>
				{/if}
			</div>
			<AppendButton />
			<button class="pill-btn pill-solid" on:click={() => dispatch('export')}>Export</button>
		</div>
	</header>
{/if}

<style>
	.project-header {
		background: var(--pm-glass-bg);
		backdrop-filter: blur(var(--pm-glass-blur));
		-webkit-backdrop-filter: blur(var(--pm-glass-blur));
		border-bottom: var(--pm-border-medium) solid rgba(30, 23, 20, 0.08);
		box-shadow: var(--pm-shadow-soft);
		height: 80px;
		position: sticky;
		top: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.5rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
		min-width: 0;
		flex: 1;
	}

	.back-btn {
		border: var(--pm-border-medium) solid rgba(30, 23, 20, 0.2);
		background: white;
		border-radius: var(--pm-radius-full);
		width: 36px;
		height: 36px;
		font-size: 1.25rem;
		cursor: pointer;
		box-shadow: 2px 2px 0 rgba(30, 23, 20, 0.1);
	}

	.title-stack {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.title-display {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.title-display h1 {
		font-size: var(--pm-text-2xl);
		font-weight: 800;
		color: var(--pm-black);
		letter-spacing: -0.03em;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.title-edit {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.title-input {
		font-size: var(--pm-text-xl);
		font-weight: 700;
		padding: 0.2rem 0.5rem;
		border-radius: var(--pm-radius-md);
		border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.3);
		min-width: 260px;
	}

	.edit-actions {
		display: inline-flex;
		gap: 0.35rem;
	}

	.pill-btn {
		border-radius: var(--pm-radius-full);
		border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.25);
		background: white;
		padding: 0.25rem 0.85rem;
		font-size: var(--pm-text-xs);
		font-weight: 600;
		cursor: pointer;
	}

	.pill-solid {
		background: var(--pm-black);
		color: white;
		border-color: var(--pm-black);
	}

	.ghost-btn {
		border: none;
		background: transparent;
		font-size: var(--pm-text-xs);
		font-weight: 600;
		color: rgba(30, 23, 20, 0.7);
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.header-right {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
	}

	.title-error {
		font-size: var(--pm-text-xs);
		color: var(--pm-pink);
		margin: 0;
	}

	@media (max-width: 768px) {
		.project-header {
			flex-direction: column;
			align-items: flex-start;
			height: auto;
			padding: 0.75rem 1rem;
			gap: 0.75rem;
		}
		.header-left {
			width: 100%;
		}
		.title-display {
			flex-wrap: wrap;
		}
		.header-right {
			align-self: flex-end;
			width: 100%;
			justify-content: flex-end;
		}
	}

	.sync-status {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: var(--pm-text-xs);
		font-weight: 600;
		color: rgba(30, 23, 20, 0.6);
		margin-right: 0.5rem;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.status-dot.success {
		background: var(--pm-mint);
		box-shadow: 0 0 0 2px rgba(168, 216, 234, 0.2);
	}

	.status-dot.local {
		background: rgba(30, 23, 20, 0.2);
	}

	@media (max-width: 640px) {
		.status-text {
			display: none;
		}
	}
</style>
