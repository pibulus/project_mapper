<script lang="ts">
	/**
	 * ActionItemsCard Component
	 *
	 * Displays action items with full CRUD functionality.
	 * This is a "dumb" component that gets its state and logic
	 * from the dedicated actionItemsStore.
	 */
	import type { ActionItem } from '$lib/core/types';
	import { marked } from 'marked';
	import {
		actionItems,
		toggleItem,
		deleteItem,
		addItem,
		updateItem,
		reorderItems
	} from '$lib/stores/actionItemsStore';
	import Card from './ui/Card.svelte';

	// Local UI state
	let isAdding = false;
	let newItemDescription = '';
	let showSearch = false;
	let searchQuery = '';
	let sortingStyle = 'manual'; // 'manual', 'assignee', 'updated_at'
	let draggedItemId: string | null = null;
	let hoveredItemId: string | null = null;
	let selectedItemIndex: number = -1; // For keyboard navigation
	let listContainerRef: HTMLDivElement;
	let modalRef: HTMLDivElement;
	let newItemTextarea: HTMLTextAreaElement;

	// Derived state from the store
	$: completedCount = $actionItems.filter((i) => i.status === 'completed').length;

	$: filteredItems = $actionItems.filter((item) => {
		const query = searchQuery.toLowerCase();
		if (!query) return true;
		return (
			item.description.toLowerCase().includes(query) ||
			(item.assignee && item.assignee.toLowerCase().includes(query)) ||
			(item.due_date && item.due_date.toLowerCase().includes(query))
		);
	});

	$: sortedItems = (() => {
		const itemsToSort = [...filteredItems];
		const completed = itemsToSort.filter((i) => i.status === 'completed');
		const uncompleted = itemsToSort.filter((i) => i.status !== 'completed');

		const sortGroup = (group: ActionItem[]) => {
			if (sortingStyle === 'assignee') {
				return group.sort((a, b) => (a.assignee || '').localeCompare(b.assignee || ''));
			} else if (sortingStyle === 'updated_at') {
				return group.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
			}
			// Use the persisted sort_order for manual sorting
			return group.sort((a, b) => a.sort_order - b.sort_order);
		};

		return [...sortGroup(uncompleted), ...sortGroup(completed)];
	})();

	// UI-only functions
	function handleSaveNewItem() {
		addItem(newItemDescription);
		newItemDescription = '';
		isAdding = false;
	}

	function handleDescriptionUpdate(event: Event, itemId: string) {
		const target = event.target as HTMLElement;
		const newDescription = target.innerText.trim();
		updateItem(itemId, { description: newDescription });
	}

	function handleDescriptionKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			(event.target as HTMLElement).blur();
		}
		if (event.key === 'Escape') {
			(event.target as HTMLElement).blur();
		}
	}

	const sortingModes = ['manual', 'assignee', 'updated_at'];
	function cycleSortMode() {
		const currentIndex = sortingModes.indexOf(sortingStyle);
		const nextIndex = (currentIndex + 1) % sortingModes.length;
		sortingStyle = sortingModes[nextIndex];
	}

	function getSortIcon() {
		if (sortingStyle === 'manual') return '✋';
		if (sortingStyle === 'assignee') return '👤';
		if (sortingStyle === 'updated_at') return '🕒';
		return 'sort';
	}

	// Keyboard navigation handler
	function handleKeyDown(event: KeyboardEvent) {
		// Ignore if typing in input/textarea
		const target = event.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
		if (target.contentEditable === 'true') return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedItemIndex = Math.min(selectedItemIndex + 1, sortedItems.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedItemIndex = Math.max(selectedItemIndex - 1, 0);
		} else if (event.key === 'Enter' && selectedItemIndex >= 0) {
			event.preventDefault();
			const item = sortedItems[selectedItemIndex];
			if (item) toggleItem(item.id);
		}
	}

	// Focus trap for modal
	function handleModalKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isAdding = false;
			newItemDescription = '';
			return;
		}

		if (event.key === 'Tab' && modalRef) {
			const focusableElements = modalRef.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			if (event.shiftKey) {
				if (document.activeElement === firstElement) {
					event.preventDefault();
					lastElement?.focus();
				}
			} else {
				if (document.activeElement === lastElement) {
					event.preventDefault();
					firstElement?.focus();
				}
			}
		}
	}

	// Focus modal when it opens
	$: if (isAdding && newItemTextarea) {
		setTimeout(() => newItemTextarea?.focus(), 100);
	}

	// Delete with confirmation
	function handleDelete(itemId: string) {
		if (confirm('Delete this action item?')) {
			deleteItem(itemId);
		}
	}

	// Drag and Drop handlers
	function handleDragStart(itemId: string) {
		if (sortingStyle !== 'manual') return;
		draggedItemId = itemId;
	}

	function handleDragOver(event: DragEvent) {
		if (sortingStyle !== 'manual') return;
		event.preventDefault();
	}

	function handleDrop(targetItemId: string) {
		if (!draggedItemId || draggedItemId === targetItemId || sortingStyle !== 'manual') {
			draggedItemId = null;
			return;
		}

		const currentItems = [...sortedItems];
		const draggedIndex = currentItems.findIndex((i) => i.id === draggedItemId);
		const targetIndex = currentItems.findIndex((i) => i.id === targetItemId);

		if (draggedIndex === -1 || targetIndex === -1) {
			draggedItemId = null;
			return;
		}

		const newItems = [...currentItems];
		const [draggedItem] = newItems.splice(draggedIndex, 1);
		newItems.splice(targetIndex, 0, draggedItem);

		reorderItems(newItems);
		draggedItemId = null;
	}
</script>

<Card title="✅ Action Items">
	<svelte:fragment slot="actions">
		<button
			class="btn-icon"
			on:click={cycleSortMode}
			aria-label="Cycle sort mode"
			title={`Sort by ${sortingStyle}`}
		>
			{getSortIcon()}
		</button>
		<button class="btn-icon" on:click={() => (showSearch = !showSearch)} aria-label="Search items">
			🔎
		</button>
		<button class="btn-ghost" on:click={() => (isAdding = !isAdding)} aria-label="Add new item">
			{isAdding ? 'Cancel' : '+ Add'}
		</button>
		{#if $actionItems.length > 0}
			<span class="card-meta">
				{completedCount}/{$actionItems.length} done
			</span>
		{/if}
	</svelte:fragment>

	<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
	<div
		bind:this={listContainerRef}
		on:keydown={handleKeyDown}
		tabindex="0"
		role="list"
		aria-label="Action items list"
		style="max-height: 400px; overflow-y: auto; outline: none;"
	>
		{#if showSearch}
			<div class="search-form">
				<input type="text" bind:value={searchQuery} placeholder="Search items..." />
			</div>
		{/if}

		{#if isAdding}
			<!-- svelte-ignore a11y-interactive-supports-focus -->
			<div
				bind:this={modalRef}
				class="add-form"
				on:keydown={handleModalKeyDown}
				role="dialog"
				aria-label="Add new action item"
			>
				<textarea
					bind:this={newItemTextarea}
					bind:value={newItemDescription}
					placeholder="Enter new action item..."
					rows="3"
					on:keydown={(e) => {
						if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
							handleSaveNewItem();
						}
					}}
				></textarea>
				<button class="btn-primary" on:click={handleSaveNewItem}>Save Item</button>
			</div>
		{/if}

		{#if sortedItems.length === 0 && !isAdding}
			<p class="empty-state">
				{searchQuery ? 'No matching items' : 'No action items yet'}
			</p>
		{:else}
			<div style="display: flex; flex-direction: column; gap: 0.5rem;">
				{#each sortedItems as item, index (item.id)}
					<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
					<div
						class="action-item-wrapper"
						class:dragging={draggedItemId === item.id}
						class:drag-over={hoveredItemId === item.id && draggedItemId !== item.id}
						class:selected={selectedItemIndex === index}
						draggable={sortingStyle === 'manual'}
						role="listitem"
						on:dragstart={() => handleDragStart(item.id)}
						on:dragover={handleDragOver}
						on:drop={() => handleDrop(item.id)}
						on:mouseenter={() => (hoveredItemId = item.id)}
						on:mouseleave={() => (hoveredItemId = null)}
						on:click={() => (selectedItemIndex = index)}
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								selectedItemIndex = index;
							}
						}}
					>
						<label class="action-item {item.status === 'completed' ? 'completed' : ''}">
							<input
								type="checkbox"
								checked={item.status === 'completed'}
								on:change={() => toggleItem(item.id)}
							/>
							<div style="flex: 1; min-width: 0;">
								<!-- svelte-ignore a11y-interactive-supports-focus -->
								<div
									class="action-text"
									contenteditable="true"
									role="textbox"
									aria-label="Edit action item description"
									on:blur={(e) => handleDescriptionUpdate(e, item.id)}
									on:keydown={handleDescriptionKeyDown}
									on:click|stopPropagation
								>
									{@html marked(item.description)}
								</div>

								<div class="action-meta">
									<input
										type="text"
										placeholder="Assignee"
										class="meta-input"
										value={item.assignee}
										on:blur={(e) => updateItem(item.id, { assignee: e.currentTarget.value })}
									/>
									<input
										type="date"
										class="meta-input"
										value={item.due_date}
										on:blur={(e) => updateItem(item.id, { due_date: e.currentTarget.value })}
									/>
								</div>
							</div>
						</label>
						<button
							class="delete-btn"
							aria-label="Delete item"
							on:click|stopPropagation={() => handleDelete(item.id)}
						>
							×
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</Card>

<style>
	.search-form {
		margin-bottom: 1rem;
	}
	.search-form input {
		width: 100%;
		padding: 0.5rem;
		border-radius: var(--pm-radius-sm);
		border: 1px solid rgba(0, 0, 0, 0.1);
	}
	.meta-input {
		background: none;
		border: 1px solid transparent;
		border-radius: var(--pm-radius-sm);
		padding: 2px 4px;
		font-size: var(--pm-text-xs);
		color: var(--pm-brown);
		width: 100px;
	}
	.meta-input:hover {
		border-color: rgba(0, 0, 0, 0.1);
	}
	.meta-input:focus {
		outline: 1px solid var(--pm-mint);
		border-color: var(--pm-mint);
	}
	.add-form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.add-form textarea {
		width: 100%;
		border-radius: var(--pm-radius-sm);
		border: 1px solid rgba(0, 0, 0, 0.1);
		padding: 0.5rem;
	}
	.add-form .btn-primary {
		align-self: flex-start;
		background: var(--pm-pink);
		color: white;
		border: none;
		padding: 6px 12px;
		border-radius: var(--pm-radius-sm);
		cursor: pointer;
	}
	.action-item-wrapper {
		position: relative;
	}

	.action-item-wrapper.dragging {
		opacity: 0.5;
	}

	.action-item-wrapper.drag-over {
		border-top: 2px solid var(--pm-pink);
	}

	.action-item-wrapper.selected .action-item {
		outline: 2px solid var(--pm-mint);
		outline-offset: 2px;
		box-shadow: 0 0 0 4px rgba(168, 216, 234, 0.15);
	}

	.delete-btn {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.1);
		color: white;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		line-height: 20px;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.action-item-wrapper:hover .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover {
		background: rgba(0, 0, 0, 0.3);
	}
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
		cursor: text;
	}

	.action-text:focus {
		outline: 1px solid var(--pm-mint);
		border-radius: var(--pm-radius-sm);
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
