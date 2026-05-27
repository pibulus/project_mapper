<script lang="ts">
  /**
   * Dashboard Component
   *
   * Simple CSS Grid layout coordinating all cards
   * Subscribes to real-time updates from the partyStore
   */
  import { currentProject } from "$lib/stores/projectStore";
  import { createProjectParty } from "$lib/stores/partyStore";
  import TranscriptCard from "./TranscriptCard.svelte";
  import SummaryCard from "./SummaryCard.svelte";
  import ActionItemsCard from "./ActionItemsCard.svelte";
  import TopicGraphCard from "./TopicGraphCard.svelte";
  import { swipe } from "$lib/actions/swipe";
  import { onDestroy } from "svelte";

  type PartyStore = ReturnType<typeof createProjectParty>;

  let party: PartyStore | null = null;
  let partyProjectId: string | null = null;

  function setPartyProject(projectId: string | null) {
    if (projectId === partyProjectId) return;

    party?.disconnect();
    party = null;
    partyProjectId = projectId;

    if (projectId) {
      party = createProjectParty(projectId);
    }
  }

  $: setPartyProject(
    $currentProject?.id && $currentProject.syncEnabled
      ? $currentProject.id
      : null,
  );

  onDestroy(() => {
    setPartyProject(null);
  });

  // Mobile Carousel State
  let activePanel = 0;
  const panels = [
    { id: "transcript", label: "Transcript" },
    { id: "summary", label: "Summary" },
    { id: "action-items", label: "Tasks" },
    { id: "graph", label: "Map" },
  ];

  function nextPanel() {
    if (activePanel < panels.length - 1) activePanel++;
  }

  function prevPanel() {
    if (activePanel > 0) activePanel--;
  }

  function setPanel(index: number) {
    activePanel = index;
  }
</script>

{#if !$currentProject}
  <div class="dashboard-grid loading">
    {#each Array(4) as _, i}
      <div class="card card-body animate-pulse">
        <div class="skeleton-line w-3/4"></div>
        <div class="skeleton-line w-full"></div>
        <div class="skeleton-line w-5/6"></div>
        <div class="skeleton-line w-4/6"></div>
      </div>
    {/each}
  </div>
{:else}
  {#if $currentProject.lastAnalysisWarnings?.length}
    <div class="analysis-banner" role="status">
      <strong>Analysis completed with gaps.</strong>
      <span>
        Some AI steps failed, so this project may need a manual pass before
        sharing.
      </span>
      <ul>
        {#each $currentProject.lastAnalysisWarnings as warning}
          <li>{warning.scope}: {warning.message}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Mobile Swipe Container -->
  <div
    class="mobile-carousel"
    use:swipe
    on:swipeleft={nextPanel}
    on:swiperight={prevPanel}
  >
    <div class="dashboard-grid" class:mobile-active={true}>
      <section class="panel transcript" class:active={activePanel === 0}>
        <TranscriptCard />
      </section>
      <section class="panel summary" class:active={activePanel === 1}>
        <SummaryCard />
      </section>
      <section class="panel action-items" class:active={activePanel === 2}>
        <ActionItemsCard />
      </section>
      <section class="panel graph" class:active={activePanel === 3}>
        <TopicGraphCard partySend={party ? party.send : null} />
      </section>
    </div>

    <div class="mobile-tabs" aria-label="Project panels">
      {#each panels as panel, i}
        <button
          class="mobile-tab"
          class:active={activePanel === i}
          on:click={() => setPanel(i)}
          aria-label="Show {panel.label}">{panel.label}</button
        >
      {/each}
    </div>
  </div>
{/if}

<style>
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: clamp(1rem, 2vw, 1.5rem);
  }

  .analysis-banner {
    display: grid;
    gap: 0.35rem;
    margin-bottom: 1rem;
    padding: 0.9rem 1rem;
    border: var(--pm-border-medium) solid rgba(232, 131, 156, 0.45);
    border-radius: var(--pm-radius-md);
    background: rgba(255, 247, 239, 0.82);
    box-shadow: var(--pm-shadow-soft);
    color: var(--pm-brown);
    font-size: var(--pm-text-sm);
  }

  .analysis-banner strong {
    color: var(--pm-black);
  }

  .analysis-banner ul {
    margin: 0.25rem 0 0;
    padding-left: 1.1rem;
  }

  .panel {
    grid-column: span 12;
  }

  /* Mobile Carousel Styles */
  .mobile-carousel {
    width: 100%;
    overflow: hidden;
  }

  .mobile-tabs {
    display: none; /* Hidden on desktop */
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-bottom: 1rem;
  }

  .mobile-tab {
    min-height: 44px;
    padding: 0.55rem 0.75rem;
    border-radius: var(--pm-radius-full);
    background: rgba(255, 255, 255, 0.56);
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.12);
    color: rgba(30, 23, 20, 0.72);
    font-size: var(--pm-text-xs);
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mobile-tab.active {
    background: var(--pm-black);
    color: var(--pm-cream);
    border-color: var(--pm-black);
  }

  @media (max-width: 767px) {
    .dashboard-grid {
      display: flex; /* Switch to flex for carousel effect if needed, or just hide/show */
      flex-direction: column;
      gap: 0;
    }

    .panel {
      display: none; /* Hide all by default */
      width: 100%;
      animation: fadeIn 0.3s ease;
    }

    .panel.active {
      display: block; /* Show only active */
    }

    .mobile-tabs {
      display: flex;
      flex-wrap: wrap;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (min-width: 768px) {
    .panel.transcript {
      grid-column: span 12;
    }
    .panel.summary {
      grid-column: span 12;
    }
    .panel.action-items {
      grid-column: span 12;
    }
  }

  @media (min-width: 1024px) {
    .panel.transcript {
      grid-column: span 8;
    }
    .panel.summary {
      grid-column: span 4;
    }
    .panel.action-items {
      grid-column: span 12;
    }
  }

  .panel.graph {
    grid-column: span 12;
  }

  .dashboard-grid.loading .card {
    min-height: 160px;
  }

  .skeleton-line {
    height: 0.75rem;
    background: rgba(30, 23, 20, 0.08);
    border-radius: 999px;
    margin-bottom: 0.5rem;
  }
</style>
