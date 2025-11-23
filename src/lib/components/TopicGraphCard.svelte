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
	<div class="card-header">
		<h3>🕸️ Topic Graph</h3>
		<div class="card-actions">
			{#if topics.length > 0}
				<span style="font-size: var(--pm-text-xs); color: var(--pm-brown); opacity: 0.7;">
					{topics.length} topics, {edges.length} connections
				</span>
			{/if}
		</div>
	</div>
	<div class="card-body">
		{#if topics.length === 0}
			<p style="color: var(--pm-brown); opacity: 0.6; font-style: italic;">No topics identified yet</p>
		{:else}
			<!-- D3 Force-Directed Graph Container -->
			<div
				bind:this={containerRef}
				style="
					width: 100%;
					border-radius: var(--pm-radius-md);
					border: var(--pm-border-medium) solid rgba(30, 23, 20, 0.12);
					overflow: hidden;
					min-height: 400px;
				"
			></div>

			<!-- Simple topic badges below graph -->
			<div style="margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
				{#each topics.slice(0, 6) as topic}
					<div
						style="
							padding: 0.375rem 0.75rem;
							border-radius: var(--pm-radius-sm);
							border: var(--pm-border-medium) solid {topic.color};
							background-color: {topic.color}20;
							display: flex;
							align-items: center;
							gap: 0.5rem;
							font-size: var(--pm-text-sm);
							font-weight: 600;
							color: var(--pm-black);
						"
					>
						<span style="font-size: 1.125rem;">{topic.emoji}</span>
						<span>{topic.label}</span>
					</div>
				{/each}
				{#if topics.length > 6}
					<div style="
						padding: 0.375rem 0.75rem;
						font-size: var(--pm-text-sm);
						color: var(--pm-brown);
						opacity: 0.6;
					">
						+{topics.length - 6} more
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
