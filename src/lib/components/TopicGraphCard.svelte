<script lang="ts">
  /**
   * TopicGraphCard Component
   *
   * D3 force-directed graph visualization for topic networks
   */
  import { browser } from "$app/environment";
  import { tick, onDestroy } from "svelte";
  import type { Node, Edge } from "$lib/core/types";
  import { currentProject, updateProject } from "$lib/stores/projectStore";
  import Card from "$lib/components/ui/Card.svelte";
  import { emojimap } from "$lib/actions/emojimap";
  import type { EmojimapHandle } from "$lib/utils/forceDirectedEmojimap";
  import { topicSelection } from "$lib/stores/topicSelection";

  export let partySend: ((type: string, data?: any) => void) | null = null;

  const STORAGE_PREFIX = "pm_topic_graph_positions";

  type GraphNode = Node & {
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
  };
  type PositionMap = Record<string, { x: number; y: number }>;
  type LayoutMode = "organic" | "readable";

  const {
    hoveredTopic: hoveredTopicStore,
    selectedTopic: selectedTopicStore,
    remoteHovers,
    remoteSelections,
  } = topicSelection;

  let graphHandle: EmojimapHandle | null = null;
  let graphContainer: HTMLDivElement | null = null;
  let storedPositions: PositionMap = {};
  let lastLoadedProjectId: string | null = null;
  let graphNodes: GraphNode[] = [];
  let lastSelectionProjectId: string | null = null;
  const NO_TOPIC = "__none__";
  let isFullscreen = false;
  let lastBroadcastHoverId: string = NO_TOPIC;
  let lastBroadcastSelectionId: string = NO_TOPIC;
  let topicLabelInput = "";
  let lastEditableTopicId: string | null = null;
  let pendingDeleteTopicId: string | null = null;
  let topicMessage = "";
  let layoutMode: LayoutMode = "organic";

  const loadPositions = (projectId: string): PositionMap => {
    if (!browser) return {};
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}:${projectId}`);
      return raw ? (JSON.parse(raw) as PositionMap) : {};
    } catch (err) {
      console.warn("[TopicGraph] Failed to load positions", err);
      return {};
    }
  };

  const savePositions = (projectId: string, positions: PositionMap) => {
    if (!browser) return;
    storedPositions = positions;
    localStorage.setItem(
      `${STORAGE_PREFIX}:${projectId}`,
      JSON.stringify(positions),
    );
  };

  const clearPositions = (projectId: string) => {
    if (!browser) return;
    localStorage.removeItem(`${STORAGE_PREFIX}:${projectId}`);
    storedPositions = {};
  };

  const topicPayload = (topic: GraphNode | null) => {
    if (!topic) return null;
    const { id, label, emoji, color } = topic;
    return { id, label, emoji, color };
  };

  function broadcastHover(topic: GraphNode | null) {
    if (!partySend) return;
    const nextId = topic?.id ?? NO_TOPIC;
    if (nextId === lastBroadcastHoverId && topic) return;
    lastBroadcastHoverId = nextId;
    partySend("topic-hover", { topic: topicPayload(topic) });
  }

  function broadcastSelection(topic: GraphNode | null) {
    if (!partySend) return;
    const nextId = topic?.id ?? NO_TOPIC;
    if (nextId === lastBroadcastSelectionId && topic) return;
    lastBroadcastSelectionId = nextId;
    partySend("topic-selection", { topic: topicPayload(topic) });
  }

  // Reactive data from store
  $: topics = $currentProject?.topics || [];
  $: edges = $currentProject?.edges || [];
  $: projectId = $currentProject?.id || null;

  // Derived selection state
  $: hoveredTopic = $hoveredTopicStore;
  $: selectedTopic = $selectedTopicStore;
  $: editableTopic = selectedTopic
    ? topics.find((topic) => topic.id === selectedTopic.id) || null
    : null;
  $: remoteHoverMap = $remoteHovers;
  $: remoteSelectionMap = $remoteSelections;
  $: remoteSelectionEntries = Object.entries(remoteSelectionMap || {}).filter(
    ([, topic]) => !!topic,
  );
  $: remoteHoverEntries = Object.entries(remoteHoverMap || {}).filter(
    ([userId, topic]) => {
      if (!topic) return false;
      const selectedTopicMatch = remoteSelectionMap?.[userId];
      return !selectedTopicMatch || selectedTopicMatch.id !== topic.id;
    },
  );

  // Load stored positions whenever project changes
  $: if (browser && projectId && projectId !== lastLoadedProjectId) {
    storedPositions = loadPositions(projectId);
    lastLoadedProjectId = projectId;
  }

  $: if (projectId && projectId !== lastSelectionProjectId) {
    topicSelection.clearHover();
    topicSelection.clearSelection();
    lastSelectionProjectId = projectId;
    lastBroadcastHoverId = NO_TOPIC;
    lastBroadcastSelectionId = NO_TOPIC;
    broadcastHover(null);
    broadcastSelection(null);
  }

  $: if ((editableTopic?.id || null) !== lastEditableTopicId) {
    topicLabelInput = editableTopic?.label || "";
    lastEditableTopicId = editableTopic?.id || null;
    pendingDeleteTopicId = null;
    topicMessage = "";
  }

  // Merge stored positions with topics
  $: graphNodes =
    layoutMode === "readable"
      ? buildReadableGraphNodes(topics)
      : topics.map((topic) => {
          const stored = storedPositions?.[topic.id];
          if (
            stored &&
            Number.isFinite(stored.x) &&
            Number.isFinite(stored.y)
          ) {
            return { ...topic, x: stored.x, y: stored.y };
          }
          return { ...topic };
        });

  function buildReadableGraphNodes(sourceTopics: Node[]): GraphNode[] {
    const width = 600;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(170, Math.max(105, sourceTopics.length * 14));

    if (sourceTopics.length === 1) {
      return [
        {
          ...sourceTopics[0],
          x: centerX,
          y: centerY,
          fx: centerX,
          fy: centerY,
        },
      ];
    }

    return sourceTopics.map((topic, index) => {
      const angle = (index / sourceTopics.length) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      return { ...topic, x, y, fx: x, fy: y };
    });
  }

  function handlePositionsChange(nodesData: any[]) {
    if (layoutMode === "readable") return;
    if (!projectId) return;
    const positions = (nodesData as GraphNode[]).reduce<PositionMap>(
      (acc, node) => {
        if (!node.id) return acc;
        acc[node.id] = {
          x: Number.isFinite(node.x) ? (node.x as number) : 0,
          y: Number.isFinite(node.y) ? (node.y as number) : 0,
        };
        return acc;
      },
      {},
    );
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
    topicSelection.clearHover();
    topicSelection.clearSelection();
    lastBroadcastHoverId = NO_TOPIC;
    lastBroadcastSelectionId = NO_TOPIC;
    broadcastHover(null);
    broadcastSelection(null);
    if (layoutMode === "readable") {
      graphHandle?.update({ nodes: graphNodes, edges, config: graphConfig });
      graphHandle?.updateLayout();
      return;
    }
    graphHandle?.resetVisualization();
  }

  async function toggleLayoutMode() {
    layoutMode = layoutMode === "organic" ? "readable" : "organic";
    await tick();
    graphHandle?.update({ nodes: graphNodes, edges, config: graphConfig });
    graphHandle?.updateLayout();
  }

  function renameSelectedTopic() {
    if (!editableTopic) return;
    const nextLabel = topicLabelInput.trim();
    if (!nextLabel || nextLabel === editableTopic.label) return;

    const nextTopics = topics.map((topic) =>
      topic.id === editableTopic.id ? { ...topic, label: nextLabel } : topic,
    );
    const renamedTopic = nextTopics.find(
      (topic) => topic.id === editableTopic.id,
    );

    updateProject({ topics: nextTopics });
    if (renamedTopic) {
      topicSelection.setSelectedTopic(renamedTopic);
      broadcastSelection(renamedTopic as GraphNode);
    }
    topicMessage = "Topic renamed";
  }

  function requestDeleteSelectedTopic() {
    if (!editableTopic) return;
    pendingDeleteTopicId =
      pendingDeleteTopicId === editableTopic.id ? null : editableTopic.id;
  }

  function deleteSelectedTopic() {
    if (!editableTopic) return;

    const nextTopics = topics.filter((topic) => topic.id !== editableTopic.id);
    const nextEdges = edges.filter(
      (edge) =>
        edge.source_topic_id !== editableTopic.id &&
        edge.target_topic_id !== editableTopic.id,
    );

    if (projectId) {
      const { [editableTopic.id]: _removedPosition, ...nextPositions } =
        storedPositions;
      savePositions(projectId, nextPositions);
    }

    updateProject({ topics: nextTopics, edges: nextEdges });
    topicSelection.clearHover();
    topicSelection.clearSelection();
    pendingDeleteTopicId = null;
    topicMessage = "";
    broadcastHover(null);
    broadcastSelection(null);
  }

  function handleTopicEditorKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      renameSelectedTopic();
    }
    if (event.key === "Escape") {
      topicLabelInput = editableTopic?.label || "";
      pendingDeleteTopicId = null;
    }
  }

  async function toggleFullscreen() {
    if (!browser) return;
    isFullscreen = !isFullscreen;
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    await tick();
    graphHandle?.updateLayout();
  }

  function closeFullscreen() {
    if (!isFullscreen) return;
    isFullscreen = false;
    if (browser) {
      document.body.style.overflow = "";
    }
    graphHandle?.updateLayout();
  }

  onDestroy(() => {
    if (browser) {
      document.body.style.overflow = "";
    }
  });

  function exportGraph() {
    if (!browser || !graphContainer) return;
    const svg = graphContainer.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    if (!source.match(/^<svg[^>]+xmlns=/)) {
      source = source.replace(
        "<svg",
        '<svg xmlns="http://www.w3.org/2000/svg"',
      );
    }
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `topics-${projectId ?? "export"}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const graphConfigBase = {
    backgroundColor: "rgba(255,255,255,0.95)",
    linkDistance: 110,
    chargeStrength: -900,
    collisionRadius: 75,
    linkStrokeWidth: 2,
    linkOpacity: 0.55,
    onPositionsChange: handlePositionsChange,
  };

  const handleNodeHover = (_event: unknown, node: any) => {
    topicSelection.setHoveredTopic(node as GraphNode);
    broadcastHover(node as GraphNode);
  };

  const handleNodeSelect = (_event: unknown, node: any) => {
    topicSelection.setSelectedTopic(node as GraphNode);
    broadcastSelection(node as GraphNode);
  };

  const clearHover = () => {
    topicSelection.clearHover();
    broadcastHover(null);
  };

  $: graphConfig = {
    ...graphConfigBase,
    chargeStrength:
      layoutMode === "readable" ? -120 : graphConfigBase.chargeStrength,
    linkDistance:
      layoutMode === "readable" ? 140 : graphConfigBase.linkDistance,
    onMouseOverNode: handleNodeHover,
    onDoubleClickNode: handleNodeSelect,
    onBackgroundClick: clearHover,
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
          <button class="graph-btn" on:click={fitGraph} title="Fit to screen"
            >Fit</button
          >
          <button class="graph-btn" on:click={resetGraph} title="Reset layout"
            >Reset</button
          >
          <button class="graph-btn" on:click={exportGraph} title="Export SVG"
            >Export</button
          >
          <button
            class="graph-btn"
            class:graph-btn-active={layoutMode === "readable"}
            on:click={toggleLayoutMode}
            title="Toggle readable layout"
          >
            {layoutMode === "readable" ? "Organic" : "Readable"}
          </button>
          <button
            class="graph-btn"
            on:click={toggleFullscreen}
            title="Toggle fullscreen"
          >
            {isFullscreen ? "Exit" : "Fullscreen"}
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
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="fullscreen-backdrop" on:click={closeFullscreen}></div>
      {/if}
      <div
        class="graph-surface"
        class:fullscreen={isFullscreen}
        bind:this={graphContainer}
        role="figure"
        aria-label="Topic Graph Visualization"
        use:emojimap={{ nodes: graphNodes, edges, config: graphConfig }}
        on:emojimapready={handleGraphReady}
        on:emojimapdestroyed={() => (graphHandle = null)}
        on:mouseleave={() => topicSelection.clearHover()}
      >
        {#if isFullscreen}
          <button
            class="fullscreen-close"
            on:click|stopPropagation={closeFullscreen}
            aria-label="Close fullscreen"
          >
            ×
          </button>
        {/if}
      </div>
    </div>

    <!-- Simple topic badges below graph -->
    <div class="badge-row">
      {#each graphNodes.slice(0, 6) as topic}
        <button
          type="button"
          class="badge"
          class:badge-active={selectedTopic?.id === topic.id}
          class:badge-hover={hoveredTopic?.id === topic.id}
          on:mouseenter={(event) => handleNodeHover(event, topic)}
          on:mouseleave={clearHover}
          on:click={(event) => handleNodeSelect(event, topic)}
          style="border: var(--pm-border-medium) solid {topic.color}; background-color: {topic.color}20;"
        >
          <span style="font-size: 1.125rem;">{topic.emoji}</span>
          <span>{topic.label}</span>
        </button>
      {/each}
      {#if topics.length > 6}
        <div class="badge-overflow">+{topics.length - 6} more</div>
      {/if}
    </div>
    {#if editableTopic}
      <div class="topic-editor" aria-label="Selected topic controls">
        <div class="topic-editor__identity">
          <span
            class="topic-editor__dot"
            style="background: {editableTopic.color || '#999999'};"
          ></span>
          <span>{editableTopic.emoji}</span>
        </div>
        <input
          type="text"
          bind:value={topicLabelInput}
          maxlength="64"
          aria-label="Selected topic label"
          on:keydown={handleTopicEditorKeydown}
        />
        <button
          type="button"
          class="topic-editor__save"
          on:click={renameSelectedTopic}
          disabled={!topicLabelInput.trim() ||
            topicLabelInput.trim() === editableTopic.label}
        >
          Rename
        </button>
        <button
          type="button"
          class:topic-editor__danger={pendingDeleteTopicId === editableTopic.id}
          on:click={pendingDeleteTopicId === editableTopic.id
            ? deleteSelectedTopic
            : requestDeleteSelectedTopic}
        >
          {pendingDeleteTopicId === editableTopic.id
            ? "Confirm Remove"
            : "Remove"}
        </button>
        {#if pendingDeleteTopicId === editableTopic.id}
          <button type="button" on:click={() => (pendingDeleteTopicId = null)}>
            Cancel
          </button>
        {/if}
        {#if topicMessage}
          <span class="topic-editor__message">{topicMessage}</span>
        {/if}
      </div>
    {/if}
    {#if remoteSelectionEntries.length || remoteHoverEntries.length}
      <div class="remote-presence">
        {#if remoteSelectionEntries.length}
          <div class="remote-stack">
            <span class="remote-heading">Following</span>
            {#each remoteSelectionEntries as [userId, topic]}
              <div class="remote-chip" title={`Viewing ${topic?.label}`}>
                <span
                  class="remote-dot"
                  style="background: {topic?.color || '#f97316'};"
                ></span>
                <span class="remote-label">{topic?.label}</span>
                <span class="remote-user">{userId.slice(0, 4)}</span>
              </div>
            {/each}
          </div>
        {/if}
        {#if remoteHoverEntries.length}
          <div class="remote-stack hover">
            <span class="remote-heading">Exploring</span>
            {#each remoteHoverEntries as [userId, topic]}
              <div class="remote-hover-chip" title={`Hovering ${topic?.label}`}>
                <span
                  class="remote-dot"
                  style="background: {topic?.color || '#0ea5e9'};"
                ></span>
                <span class="remote-label">{topic?.label}</span>
                <span class="remote-user">{userId.slice(0, 4)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
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
    min-height: 44px;
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.2);
    border-radius: var(--pm-radius-sm);
    background: white;
    padding: 0.45rem 0.7rem;
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

  .graph-btn-active {
    border-color: var(--pm-black);
    background: var(--pm-black);
    color: white;
  }

  .graph-btn-active:hover {
    color: white;
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

  .topic-editor {
    display: grid;
    grid-template-columns: auto minmax(10rem, 1fr) auto auto auto;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.85rem;
    padding: 0.7rem;
    border: var(--pm-border-medium) solid rgba(30, 23, 20, 0.1);
    border-radius: var(--pm-radius-sm);
    background: rgba(255, 255, 255, 0.7);
  }

  .topic-editor__identity {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 44px;
    padding: 0 0.45rem;
    border-radius: var(--pm-radius-full);
    background: rgba(255, 247, 239, 0.82);
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.08);
  }

  .topic-editor__dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 999px;
    box-shadow: inset 0 0 0 1px rgba(30, 23, 20, 0.16);
  }

  .topic-editor input {
    min-height: 44px;
    min-width: 0;
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.2);
    border-radius: var(--pm-radius-sm);
    background: white;
    padding: 0.55rem 0.7rem;
    color: var(--pm-black);
    font-size: var(--pm-text-sm);
    font-weight: 700;
  }

  .topic-editor button {
    min-height: 44px;
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.2);
    border-radius: var(--pm-radius-sm);
    background: white;
    padding: 0.5rem 0.75rem;
    color: var(--pm-brown);
    font-size: var(--pm-text-xs);
    font-weight: 800;
    cursor: pointer;
  }

  .topic-editor button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .topic-editor__save {
    background: var(--pm-black) !important;
    border-color: var(--pm-black) !important;
    color: white !important;
  }

  .topic-editor__danger {
    background: #ff6b9d !important;
    border-color: #ff6b9d !important;
    color: white !important;
  }

  .topic-editor__message {
    grid-column: 2 / -1;
    color: rgba(30, 23, 20, 0.62);
    font-size: var(--pm-text-xs);
    font-weight: 700;
  }

  .remote-stack {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }

  .remote-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border-radius: var(--pm-radius-full);
    padding: 0.25rem 0.6rem;
    font-size: var(--pm-text-xs);
    background: rgba(64, 64, 64, 0.08);
    border: 1px dashed rgba(64, 64, 64, 0.3);
  }

  .remote-hover-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border-radius: var(--pm-radius-full);
    padding: 0.25rem 0.6rem;
    font-size: var(--pm-text-xs);
    background: rgba(56, 189, 248, 0.12);
    border: 1px dashed rgba(56, 189, 248, 0.4);
  }

  .remote-presence {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .remote-stack.hover {
    opacity: 0.85;
  }

  .remote-heading {
    font-size: var(--pm-text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(30, 23, 20, 0.6);
    margin-right: 0.4rem;
  }

  .remote-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f97316;
  }

  .remote-label {
    font-weight: 600;
    color: var(--pm-brown);
  }

  .remote-user {
    font-family: var(--pm-font-mono, monospace);
    color: rgba(30, 23, 20, 0.7);
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
    width: 44px;
    height: 44px;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 720px) {
    .graph-toolbar {
      justify-content: flex-start;
    }

    .graph-controls {
      flex-wrap: wrap;
    }

    .topic-editor {
      grid-template-columns: 1fr;
    }

    .topic-editor__message {
      grid-column: 1;
    }
  }
</style>
