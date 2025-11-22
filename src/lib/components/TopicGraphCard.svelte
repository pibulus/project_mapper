<script lang="ts">
	/**
	 * TopicGraphCard Component
	 *
	 * Displays topic visualization
	 * TODO: Add D3 force-directed graph
	 */
	import type { Node, Edge } from '$lib/core/types';

	export let topics: Node[] = [];
	export let edges: Edge[] = [];
</script>

<div class="card">
	<div class="card-header">
		<h3 class="text-lg font-bold">🕸️ Topic Graph</h3>
	</div>
	<div class="card-body min-h-64">
		{#if topics.length === 0}
			<p class="text-gray-500 italic">No topics identified yet</p>
		{:else}
			<!-- Simple topic list for now (D3 visualization coming) -->
			<div class="flex flex-wrap gap-2">
				{#each topics as topic}
					<div
						class="px-3 py-2 rounded-lg border-2 flex items-center gap-2"
						style="background-color: {topic.color}20; border-color: {topic.color};"
					>
						<span class="text-2xl">{topic.emoji}</span>
						<span class="text-sm font-medium">{topic.label}</span>
					</div>
				{/each}
			</div>

			{#if edges.length > 0}
				<div class="mt-4 pt-4 border-t-2 border-gray-100">
					<p class="text-xs text-gray-600">
						{edges.length} connections between topics
					</p>
				</div>
			{/if}

			<!-- TODO: Add D3 force-directed graph visualization -->
			<div class="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
				<p class="text-sm text-yellow-800">
					📊 Interactive graph visualization coming soon
				</p>
			</div>
		{/if}
	</div>
</div>
