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

	function toggleItem(item: ActionItem) {
		const updated = items.map((i) =>
			i.id === item.id ? { ...i, status: i.status === 'completed' ? 'pending' : 'completed' } : i
		);

		updateProject({ actionItems: updated });
	}
</script>

<div class="card h-full flex flex-col">
	<div class="card-header flex items-center justify-between">
		<h3 class="text-lg font-bold">✅ Action Items</h3>
		{#if items.length > 0}
			<span class="text-xs text-gray-600">
				{items.filter((i) => i.status === 'completed').length}/{items.length}
			</span>
		{/if}
	</div>
	<div class="card-body flex-1 overflow-y-auto max-h-96">
		{#if items.length === 0}
			<p class="text-gray-500 italic">No action items yet</p>
		{:else}
			<div class="space-y-2">
				{#each items as item (item.id)}
					<label
						class="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-100 hover:border-gray-200 cursor-pointer transition-all {item.status ===
						'completed'
							? 'bg-green-50 border-green-200'
							: 'bg-white'}"
					>
						<input
							type="checkbox"
							checked={item.status === 'completed'}
							on:change={() => toggleItem(item)}
							class="mt-0.5 w-5 h-5 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
						/>
						<div class="flex-1 min-w-0">
							<p
								class="text-sm {item.status === 'completed'
									? 'line-through text-gray-500'
									: 'text-gray-900'}"
							>
								{item.description}
							</p>
							{#if item.assignee}
								<p class="text-xs text-gray-500 mt-1">
									👤 {item.assignee}
								</p>
							{/if}
							{#if item.deadline}
								<p class="text-xs text-gray-500 mt-1">
									📅 {item.deadline}
								</p>
							{/if}
						</div>
					</label>
				{/each}
			</div>
		{/if}
	</div>
</div>
