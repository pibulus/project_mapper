<script lang="ts">
	/**
	 * ActionItemsCard Component
	 *
	 * Displays action items with checkboxes
	 * TODO: Add AI auto-checkoff feature
	 */
	import type { ActionItem } from '$lib/core/types';
	import { currentProject, updateProject } from '$lib/stores/projectStore';

	export let items: ActionItem[] = [];

	$: completedCount = items.filter((i) => i.status === 'completed').length;

	function toggleItem(item: ActionItem) {
		const updated = items.map((i) =>
			i.id === item.id ? { ...i, status: i.status === 'completed' ? 'pending' : 'completed' } : i
		);

		updateProject({ actionItems: updated });
	}
</script>

<div class="card">
	<div class="card-header">
		<h3>✅ Action Items</h3>
		<div class="card-actions">
			{#if items.length > 0}
				<span style="font-size: var(--pm-text-xs); color: var(--pm-brown); opacity: 0.7;">
					{completedCount}/{items.length} done
				</span>
			{/if}
		</div>
	</div>
	<div class="card-body" style="max-height: 400px; overflow-y: auto;">
		{#if items.length === 0}
			<p style="color: var(--pm-brown); opacity: 0.6; font-style: italic;">No action items yet</p>
		{:else}
			<div style="display: flex; flex-direction: column; gap: 0.5rem;">
				{#each items as item (item.id)}
					<label class="action-item {item.status === 'completed' ? 'completed' : ''}">
						<input
							type="checkbox"
							checked={item.status === 'completed'}
							on:change={() => toggleItem(item)}
						/>
						<div style="flex: 1; min-width: 0;">
							<p class="action-text">
								{item.description}
							</p>
							{#if item.assignee || item.deadline}
								<div class="action-meta">
									{#if item.assignee}
										<span>👤 {item.assignee}</span>
									{/if}
									{#if item.deadline}
										<span>📅 {item.deadline}</span>
									{/if}
								</div>
							{/if}
						</div>
					</label>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.action-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: var(--pm-radius-sm);
		background: var(--pm-cream-dark);
		border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.08);
		cursor: pointer;
		transition: all var(--pm-transition-fast);
	}

	.action-item:hover {
		background: var(--pm-cream-light);
		border-color: rgba(30, 23, 20, 0.12);
		transform: translateY(-1px);
	}

	.action-item.completed {
		background: rgba(168, 216, 234, 0.15);
		border-color: var(--pm-mint);
	}

	.action-item input[type='checkbox'] {
		margin-top: 0.25rem;
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
	}

	.action-text {
		font-size: var(--pm-text-sm);
		color: var(--pm-black);
		line-height: 1.5;
	}

	.completed .action-text {
		text-decoration: line-through;
		opacity: 0.5;
	}

	.action-meta {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.25rem;
		font-size: var(--pm-text-xs);
		color: var(--pm-brown);
		opacity: 0.7;
	}
</style>
