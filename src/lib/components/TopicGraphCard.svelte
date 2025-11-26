<script lang="ts">
	/**
	 * TopicGraphCard Component
	 *
	 * D3 force-directed graph visualization for topic networks
	 */
	import { browser } from '$app/environment';
	import { tick, onDestroy } from 'svelte';
	import type { Node, Edge } from '$lib/core/types';
	import { currentProject } from '$lib/stores/projectStore';
import Card from './ui/Card.svelte';
import { emojimap } from '$lib/actions/emojimap';
import type { EmojimapHandle } from '$lib/utils/forceDirectedEmojimap';
import { topicSelection } from '$lib/stores/topicSelection';

	const STORAGE_PREFIX = 'pm_topic_graph_positions';

	type GraphNode = Node & { x?: number; y?: number };
	type PositionMap = Record<string, { x: number; y: number }>;

	const { hoveredTopic: hoveredTopicStore, selectedTopic: selectedTopicStore } = topicSelection;

	let graphHandle: EmojimapHandle | null = null;
	let graphContainer: HTMLDivElement | null = null;
	let storedPositions: PositionMap = {};
let lastLoadedProjectId: string | null = null;
let graphNodes: GraphNode[] = [];
let lastSelectionProjectId: string | null = null;
let isFullscreen = false;

	const loadPositions = (projectId: string): PositionMap => {
		if (!browser) return {};
		try {
			const raw = localStorage.getItem(`${STORAGE_PREFIX}:${projectId}`);
			return raw ? (JSON.parse(raw) as PositionMap) : {};
		} catch (err) {
			console.warn('[TopicGraph] Failed to load positions', err);
			return {};
		}
	};

	const savePositions = (projectId: string, positions: PositionMap) => {
		if (!browser) return;
		storedPositions = positions;
		localStorage.setItem(`${STORAGE_PREFIX}:${projectId}`, JSON.stringify(positions));
	};

	const clearPositions = (projectId: string) => {
		if (!browser) return;
		localStorage.removeItem(`${STORAGE_PREFIX}:${projectId}`);
		storedPositions = {};
	};

	// Reactive data from store
	$: topics = $currentProject?.topics || [];
	$: edges = $currentProject?.edges || [];
	$: projectId = $currentProject?.id || null;

	// Derived selection state
	$: hoveredTopic = $hoveredTopicStore;
	$: selectedTopic = $selectedTopicStore;

	// Load stored positions whenever project changes
$: if (browser && projectId && projectId !== lastLoadedProjectId) {
	storedPositions = loadPositions(projectId);
	lastLoadedProjectId = projectId;
}

$: if (projectId && projectId !== lastSelectionProjectId) {
	topicSelection.clearHover();
	topicSelection.clearSelection();
	lastSelectionProjectId = projectId;
}

	// Merge stored positions with topics
	$: graphNodes = topics.map((topic) => {
		const stored = storedPositions?.[topic.id];
		if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
			return { ...topic, x: stored.x, y: stored.y };
		}
		return { ...topic };
	});

	function handlePositionsChange(nodesData: GraphNode[]) {
		if (!projectId) return;
		const positions = nodesData.reduce<PositionMap>((acc, node) => {
			if (!node.id) return acc;
			acc[node.id] = {
				x: Number.isFinite(node.x) ? (node.x as number) : 0,
				y: Number.isFinite(node.y) ? (node.y as number) : 0
			};
			return acc;
		}, {});
		savePositions(projectId, { ...storedPositions, ...positions });
	}

	function handleGraphReady(event: CustomEvent<EmojimapHandle>) {
		graphHandle = event.detail;
		graphHandle?.updateLayout();
	}

	function fitGraph() {
		graphHandle?.updateLayout();
	}

function resetGraph() {
	if (!projectId) return;
	clearPositions(projectId);
	graphHandle?.resetVisualization();
}

async function toggleFullscreen() {
	if (!browser) return;
	isFullscreen = !isFullscreen;
	document.body.style.overflow = isFullscreen ? 'hidden' : '';
	await tick();
	graphHandle?.updateLayout();
}

function closeFullscreen() {
	if (!isFullscreen) return;
	isFullscreen = false;
	if (browser) {
		document.body.style.overflow = '';
	}
	graphHandle?.updateLayout();
}

onDestroy(() => {
	if (browser) {
		document.body.style.overflow = '';
	}
});

	function exportGraph() {
		if (!browser || !graphContainer) return;
		const svg = graphContainer.querySelector('svg');
		if (!svg) return;
		const serializer = new XMLSerializer();
		let source = serializer.serializeToString(svg);
		if (!source.match(/^<svg[^>]+xmlns=/)) {
			source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
		}
		const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `topics-${projectId ?? 'export'}.svg`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	const graphConfigBase = {
		backgroundColor: 'rgba(255,255,255,0.95)',
		linkDistance: 110,
		chargeStrength: -900,
		collisionRadius: 75,
		linkStrokeWidth: 2,
		linkOpacity: 0.55,
		onPositionsChange: handlePositionsChange
	};

	const handleNodeHover = (_event: unknown, node: GraphNode) => {
		topicSelection.setHoveredTopic(node);
	};

	const handleNodeSelect = (_event: unknown, node: GraphNode) => {
		topicSelection.setSelectedTopic(node);
	};

	const clearHover = () => {
		topicSelection.clearHover();
	};

	$: graphConfig = {
		...graphConfigBase,
		onMouseOverNode: handleNodeHover,
		onDoubleClickNode: handleNodeSelect,
		onBackgroundClick: clearHover
	};
</script>

<Card title="🕸️ Topic Graph">
	<svelte:fragment slot="actions">
		{#if topics.length > 0}
			<div class="graph-toolbar">
				<span class="card-meta">
					{topics.length} topics, {edges.length} connections
				</span>
				<div class="graph-controls">
					<button class="graph-btn" on:click={fitGraph} title="Fit to screen">Fit</button>
					<button class="graph-btn" on:click={resetGraph} title="Reset layout">Reset</button>
					<button class="graph-btn" on:click={exportGraph} title="Export SVG">Export</button>
					<button class="graph-btn" on:click={toggleFullscreen} title="Toggle fullscreen">
						{isFullscreen ? 'Exit' : 'Fullscreen'}
					</button>
				</div>
			</div>
		{/if}
	</svelte:fragment>

	{#if topics.length === 0}
		<p class="empty-state">No topics identified yet</p>
	{:else}
		<div class:fullscreen-wrapper={isFullscreen}>
			{#if isFullscreen}
				<div class="fullscreen-backdrop" on:click={closeFullscreen}></div>
			{/if}
			<div
				class="graph-surface"
				class:fullscreen={isFullscreen}
				bind:this={graphContainer}
				use:emojimap={{ nodes: graphNodes, edges, config: graphConfig }}
				on:emojimapready={handleGraphReady}
				on:emojimapdestroyed={() => (graphHandle = null)}
				on:mouseleave={() => topicSelection.clearHover()}
			>
				{#if isFullscreen}
					<button class="fullscreen-close" on:click|stopPropagation={closeFullscreen} aria-label="Close fullscreen">
						×
					</button>
				{/if}
			</div>
		</div>

		<!-- Simple topic badges below graph -->
		<div class="badge-row">
			{#each topics.slice(0, 6) as topic}
				<div
					class="badge"
					class:badge-active={selectedTopic?.id === topic.id}
					class:badge-hover={hoveredTopic?.id === topic.id}
					on:mouseenter={() => topicSelection.setHoveredTopic(topic)}
					on:mouseleave={() => topicSelection.clearHover()}
					on:click={() => topicSelection.setSelectedTopic(topic)}
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

<style>
	.graph-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.graph-controls {
		display: inline-flex;
		gap: 0.35rem;
	}

	.graph-btn {
		border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.2);
		border-radius: var(--pm-radius-sm);
		background: white;
		padding: 0.15rem 0.6rem;
		font-size: var(--pm-text-xs);
		font-weight: 600;
		color: var(--pm-brown);
		cursor: pointer;
		transition: all var(--pm-transition-fast);
		box-shadow: 2px 2px 0 rgba(30, 23, 20, 0.08);
	}

	.graph-btn:hover {
		border-color: var(--pm-pink);
		color: var(--pm-pink);
		transform: translateY(-1px);
		box-shadow: 3px 3px 0 rgba(30, 23, 20, 0.12);
	}

	.badge-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border-radius: var(--pm-radius-full);
		padding: 0.3rem 0.75rem;
		font-size: var(--pm-text-sm);
		background: var(--pm-cream-light);
		transition: all var(--pm-transition-fast);
	}

	.badge-hover {
		border-color: var(--pm-pink);
	}

	.badge-active {
		border-color: var(--pm-pink);
		box-shadow: 3px 3px 0 rgba(255, 105, 180, 0.25);
		background: rgba(255, 105, 180, 0.08);
	}

	.badge-overflow {
		font-size: var(--pm-text-sm);
		color: var(--pm-brown);
		opacity: 0.7;
	}

	.empty-state {
		padding: 1rem 0;
		color: var(--pm-brown);
		opacity: 0.7;
		text-align: center;
	}

	.graph-surface {
		width: 100%;
		min-height: 400px;
		border-radius: var(--pm-radius-md);
		border: var(--pm-border-medium) solid rgba(30, 23, 20, 0.12);
		overflow: hidden;
		position: relative;
		background: white;
	}

	.graph-surface.fullscreen {
		position: fixed;
		top: 5%;
		left: 50%;
		transform: translateX(-50%);
		width: min(1200px, 92vw);
		height: 80vh;
		min-height: unset;
		z-index: 1001;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
	}

	.fullscreen-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(10, 8, 6, 0.65);
		backdrop-filter: blur(6px);
		z-index: 1000;
	}

	.fullscreen-close {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		border: none;
		background: rgba(255, 255, 255, 0.9);
		border-radius: 999px;
		width: 32px;
		height: 32px;
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
	}
</style>
