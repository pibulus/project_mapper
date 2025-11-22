<script lang="ts">
	/**
	 * TopicGraphCard Component
	 *
	 * D3 force-directed graph visualization for topic networks
	 * Ported from conversation_mapper_fresh
	 */
	import { onMount, onDestroy } from 'svelte';
	import type { Node, Edge } from '$lib/core/types';
	import { forceDirectedEmojimap, type EmojimapHandle } from '$lib/utils/forceDirectedEmojimap';

	export let topics: Node[] = [];
	export let edges: Edge[] = [];

	let containerRef: HTMLDivElement;
	let emojimapHandle: EmojimapHandle | null = null;
	let isFullscreen = false;

	// Convert our edge format to D3 format
	$: d3Edges = edges.map((edge) => ({
		id: edge.id,
		source: edge.source_topic_id,
		target: edge.target_topic_id,
		color: '#999'
	}));

	function initializeVisualization() {
		if (!containerRef || topics.length === 0) return;

		// Destroy existing visualization
		if (emojimapHandle) {
			emojimapHandle.destroy();
		}

		const rect = containerRef.getBoundingClientRect();
		const width = rect.width;
		const height = 400; // Fixed height for card view

		// Initialize D3 force-directed graph
		emojimapHandle = forceDirectedEmojimap(containerRef, {
			nodes: topics,
			edges: d3Edges,
			config: {
				width,
				height,
				backgroundColor: 'rgba(255,255,255,0.95)',
				linkDistance: 100,
				chargeStrength: -850,
				collisionRadius: 70,
				linkStrokeWidth: 2,
				linkOpacity: 0.5
			}
		});
	}

	// Initialize when topics or edges change
	$: if (topics.length > 0) {
		// Small delay to ensure DOM is ready
		setTimeout(initializeVisualization, 100);
	}

	onMount(() => {
		initializeVisualization();

		// Handle window resize
		const handleResize = () => {
			initializeVisualization();
		};
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	onDestroy(() => {
		if (emojimapHandle) {
			emojimapHandle.destroy();
		}
	});
</script>

<div class="card">
	<div class="card-header flex items-center justify-between">
		<h3 class="text-lg font-bold">🕸️ Topic Graph</h3>
		{#if topics.length > 0}
			<span class="text-xs text-gray-600">
				{topics.length} topics, {edges.length} connections
			</span>
		{/if}
	</div>
	<div class="card-body">
		{#if topics.length === 0}
			<p class="text-gray-500 italic">No topics identified yet</p>
		{:else}
			<!-- D3 Force-Directed Graph Container -->
			<div
				bind:this={containerRef}
				class="w-full rounded-lg border-2 border-gray-200 overflow-hidden"
				style="min-height: 400px;"
			></div>

			<!-- Simple topic badges below graph -->
			<div class="mt-4 flex flex-wrap gap-2">
				{#each topics.slice(0, 6) as topic}
					<div
						class="px-3 py-1.5 rounded-lg border-2 flex items-center gap-2 text-sm"
						style="background-color: {topic.color}20; border-color: {topic.color};"
					>
						<span class="text-lg">{topic.emoji}</span>
						<span class="font-medium">{topic.label}</span>
					</div>
				{/each}
				{#if topics.length > 6}
					<div class="px-3 py-1.5 text-sm text-gray-500">
						+{topics.length - 6} more
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
