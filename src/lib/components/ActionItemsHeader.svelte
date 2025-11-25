<!--
  @component
  ActionItemsHeader Component

  Dedicated header for ActionItems with icon buttons and tooltips
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let sortingStyle: 'manual' | 'assignee' | 'updated_at' = 'manual';
	export let showSearch = false;
	export let isAdding = false;
	export let completedCount = 0;
	export let totalCount = 0;

	function getSortIcon() {
		if (sortingStyle === 'manual') return '✋';
		if (sortingStyle === 'assignee') return '👤';
		if (sortingStyle === 'updated_at') return '🕒';
		return '✋';
	}

	function getSortTooltip() {
		if (sortingStyle === 'manual') return 'Sort by hand (drag to reorder)';
		if (sortingStyle === 'assignee') return 'Sort by assignee';
		if (sortingStyle === 'updated_at') return 'Sort by most recent';
		return 'Sort items';
	}
</script>

<div class="header-actions">
	<!-- Sort button -->
	<button
		class="icon-btn"
		on:click={() => dispatch('cycleSortMode')}
		aria-label="Cycle sort mode"
		title={getSortTooltip()}
	>
		<span class="icon-btn-emoji">{getSortIcon()}</span>
	</button>

	<!-- Search toggle button -->
	<button
		class="icon-btn"
		class:icon-btn-active={showSearch}
		on:click={() => dispatch('toggleSearch')}
		aria-label={showSearch ? 'Hide search' : 'Show search'}
		aria-pressed={showSearch}
		title={showSearch ? 'Hide search' : 'Search action items'}
	>
		<span class="icon-btn-emoji">🔎</span>
	</button>

	<!-- Add/Cancel button -->
	<button
		class="btn-add"
		class:btn-cancel={isAdding}
		on:click={() => dispatch('toggleAdding')}
		aria-label={isAdding ? 'Cancel' : 'Add new item'}
	>
		{isAdding ? 'Cancel' : '+ Add'}
	</button>

	<!-- Stats display -->
	{#if totalCount > 0}
		<span class="header-stats">
			{completedCount}/{totalCount}
		</span>
	{/if}
</div>

<style>
	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--pm-cream-light);
		border: 2px solid rgba(30, 23, 20, 0.1);
		cursor: pointer;
		transition: all var(--pm-transition-fast);
		box-shadow: 2px 2px 0 rgba(30, 23, 20, 0.08);
	}

	.icon-btn:hover {
		background: white;
		border-color: var(--pm-pink);
		transform: translateY(-1px);
		box-shadow: 2px 3px 0 rgba(30, 23, 20, 0.12);
	}

	.icon-btn-active {
		background: var(--pm-pink);
		border-color: var(--pm-pink);
		color: white;
		box-shadow: 2px 3px 0 rgba(255, 105, 180, 0.35);
	}

	.icon-btn:active {
		transform: translateY(0);
		box-shadow: 1px 1px 0 rgba(30, 23, 20, 0.08);
	}

	.icon-btn-emoji {
		font-size: 0.875rem;
		line-height: 1;
	}

	.icon-btn-active .icon-btn-emoji {
		color: white;
	}

	.btn-add {
		padding: 0.375rem 0.75rem;
		background: var(--pm-pink);
		color: white;
		border: 2px solid var(--pm-pink);
		border-radius: var(--pm-radius-sm);
		font-size: var(--pm-text-sm);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--pm-transition-fast);
		box-shadow: 2px 2px 0 rgba(30, 23, 20, 0.1);
	}

	.btn-add:hover {
		background: #ff69b4;
		border-color: #ff69b4;
		transform: translateY(-1px);
		box-shadow: 2px 3px 0 rgba(30, 23, 20, 0.15);
	}

	.btn-add:active {
		transform: translateY(0);
		box-shadow: 1px 1px 0 rgba(30, 23, 20, 0.1);
	}

	.btn-cancel {
		background: white;
		color: var(--pm-brown);
		border-color: rgba(30, 23, 20, 0.2);
	}

	.btn-cancel:hover {
		background: var(--pm-cream-light);
		border-color: rgba(30, 23, 20, 0.3);
	}

	.header-stats {
		font-size: var(--pm-text-xs);
		color: var(--pm-brown);
		font-weight: 600;
		padding: 0.25rem 0.625rem;
		background: rgba(168, 216, 234, 0.2);
		border: 2px solid var(--pm-mint);
		border-radius: var(--pm-radius-sm);
		box-shadow: 2px 2px 0 rgba(168, 216, 234, 0.15);
	}
</style>
