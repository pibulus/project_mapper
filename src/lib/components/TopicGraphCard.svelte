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
	import { currentProject } from '$lib/stores/projectStore';
	import Card from './ui/Card.svelte';

	// Get data from store
	$: topics = $currentProject?.topics || [];
	$: edges = $currentProject?.edges || [];

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

<Card title="🕸️ Topic Graph">
	<svelte:fragment slot="actions">
		{#if topics.length > 0}
			<span class="card-meta">
				{topics.length} topics, {edges.length} connections
			</span>
		{/if}
	</svelte:fragment>

	{#if topics.length === 0}
		<p class="empty-state">No topics identified yet</p>
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
		<div class="badge-row">
			{#each topics.slice(0, 6) as topic}
				<div
					class="badge"
					style="border: var(--pm-border-medium) solid {topic.color}; background-color: {topic.color}20;"
				>
					<span style="font-size: 1.125rem;">{topic.emoji}</span>
					<span>{topic.label}</span>
				</div>
			{/each}
			{#if topics.length > 6}
				<div class="badge-overflow">+{topics.length - 6} more</div>
			{/if}
		</div>
	{/if}
</Card>
