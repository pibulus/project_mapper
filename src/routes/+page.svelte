<script lang="ts">
  /**
   * ProMapper - Main Page
   *
   * Conditional layout:
   * - No project: Show hero + upload UI
   * - Active project: Show dashboard with cards
   */
  import { onMount } from "svelte";
  import {
    clearCurrentProject,
    currentProject,
    isLoading,
    loadFromSupabase,
    loadLocalProject,
    loadFromLocalStorage,
    localProjects,
  } from "$lib/stores/projectStore";
  import Upload from "$lib/components/Upload.svelte";
  import Dashboard from "$lib/components/Dashboard.svelte";
  import ExportDrawer from "$lib/components/ExportDrawer.svelte";
  import TopicTooltip from "$lib/components/TopicTooltip.svelte";
  import ProjectHeader from "$lib/components/ProjectHeader.svelte";

  let exportDrawerOpen = false;
  let starterText = "";
  let starterTextKey = 0;

  const sampleRant = `Spidergoats sound fake until you realize the useful part is the silk, not the goat.

The real project would be mapping what has to be true: animal welfare constraints, silk protein yield, lab processing, public reaction, regulation, and whether this is actually better than yeast or bacteria production.

I want a map of the science, the weird social backlash, the risks, and the most practical next experiments. Then turn it into a short article I can edit.`;

  // Auto-restore from localStorage on mount
  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const sharedProjectId = params.get("project");

    if (sharedProjectId) {
      const sharedProject = await loadFromSupabase(sharedProjectId);
      if (sharedProject) return;
    }

    loadFromLocalStorage();
  });

  function loadSampleRant() {
    starterText = sampleRant;
    starterTextKey += 1;
  }

  function formatProjectDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
</script>

<svelte:head>
  <title>ProMapper</title>
  <meta
    name="description"
    content="Turn raw conversation into a clear project map with audio, text, action items, and live collaboration."
  />
</svelte:head>

<div class="min-h-screen">
  <!-- Header -->
  {#if $currentProject}
    <ProjectHeader
      project={$currentProject}
      on:back={clearCurrentProject}
      on:export={() => (exportDrawerOpen = true)}
    />
  {:else}
    <header class="app-header">
      <div class="shell app-header__inner">
        <div class="app-header__brand">
          <span class="section-kicker">Conversation to clarity</span>
          <h1>ProMapper</h1>
        </div>
      </div>
    </header>
  {/if}

  <!-- Main content -->
  <main class="landing-main">
    {#if $isLoading}
      <div class="shell dashboard-shell">
        <div class="loading-card">
          <span class="inline-block animate-spin-slow">⚙️</span>
          Loading shared project...
        </div>
      </div>
    {:else if $currentProject}
      <!-- Show dashboard when project exists -->
      <div class="shell dashboard-shell">
        <Dashboard />
        <TopicTooltip />
      </div>
    {:else}
      <div class="shell home-shell">
        <section class="glass-card hero-card">
          <div class="hero-grid">
            <div class="hero-copy">
              <div class="section-kicker">Welcome to ProMapper</div>
              <h2>Turn a conversation into a project map.</h2>
              <p class="hero-lede">
                Record, paste, or upload. ProMapper turns the mess into a map,
                checklist, summary, and editable article draft.
              </p>
              <div class="hero-actions">
                <button
                  type="button"
                  class="sample-btn"
                  on:click={loadSampleRant}
                >
                  Try the weird science rant
                </button>
              </div>
              <div class="payoff-preview" aria-label="Example project output">
                <div class="preview-map">
                  <span class="preview-node node-a">Silk yield</span>
                  <span class="preview-node node-b">Bioethics</span>
                  <span class="preview-node node-c">Public story</span>
                </div>
                <div class="preview-list">
                  <span>✓ Pull out the useful tasks</span>
                  <span>↳ Map the new connections</span>
                  <span>MD Export editable draft</span>
                </div>
              </div>
            </div>
            <div class="hero-panel">
              <Upload
                initialText={starterText}
                initialTextKey={starterTextKey}
              />
            </div>
          </div>
        </section>

        {#if $localProjects.length}
          <section class="recent-projects" aria-label="Recent projects">
            <div class="recent-heading">
              <p class="section-kicker">Recent work</p>
              <h2>Pick up a previous map.</h2>
            </div>
            <div class="recent-list">
              {#each $localProjects.slice(0, 5) as project}
                <button
                  type="button"
                  class="recent-project"
                  on:click={() => loadLocalProject(project.id)}
                >
                  <span class="recent-project__title">{project.title}</span>
                  <span class="recent-project__meta">
                    {project.isPublic
                      ? "Shared"
                      : project.syncEnabled
                        ? "Cloud saved"
                        : "Local"} · {formatProjectDate(project.updatedAt)}
                  </span>
                  {#if project.summary}
                    <span class="recent-project__summary">
                      {project.summary}
                    </span>
                  {/if}
                </button>
              {/each}
            </div>
          </section>
        {/if}

        <section class="feature-grid" aria-label="Product highlights">
          <div class="feature-card card">
            <div class="card-body">
              <div class="feature-icon">🎙️</div>
              <h3>Capture first</h3>
              <p>Talk, paste, or upload without changing tools.</p>
            </div>
          </div>
          <div class="feature-card card">
            <div class="card-body">
              <div class="feature-icon">🧭</div>
              <h3>Map the signal</h3>
              <p>Pull out the transcript, summary, tasks, and topics.</p>
            </div>
          </div>
          <div class="feature-card card">
            <div class="card-body">
              <div class="feature-icon">👥</div>
              <h3>Ready to sync</h3>
              <p>Keep it local, or bring people in when the work needs them.</p>
            </div>
          </div>
        </section>
      </div>
    {/if}
  </main>

  <!-- Export Drawer -->
  <ExportDrawer
    bind:isOpen={exportDrawerOpen}
    project={$currentProject}
    transcript={$currentProject?.transcript || ""}
  />
</div>

<style>
  .app-header {
    background: var(--pm-glass-bg);
    border-bottom: var(--pm-border-medium) solid rgba(30, 23, 20, 0.08);
    box-shadow: var(--pm-shadow-soft);
    z-index: 30;
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .app-header__inner {
    display: flex;
    justify-content: center;
    padding: 0.9rem 0 1rem;
  }

  .app-header__brand {
    display: grid;
    justify-items: center;
    gap: 0.75rem;
    text-align: center;
  }

  .app-header h1 {
    font-size: clamp(1.5rem, 3vw, 2.1rem);
    font-weight: 800;
    color: var(--pm-black);
    letter-spacing: -0.05em;
    margin: 0;
  }

  .landing-main {
    padding: clamp(1.25rem, 3vw, 2.25rem) 0 4rem;
  }

  .dashboard-shell {
    padding-top: 0.5rem;
  }

  .loading-card {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border: var(--pm-border-medium) solid rgba(30, 23, 20, 0.12);
    border-radius: var(--pm-radius-md);
    background: rgba(255, 247, 239, 0.78);
    box-shadow: var(--pm-shadow-soft);
    font-weight: 700;
  }

  .home-shell {
    display: grid;
    gap: clamp(1.5rem, 3vw, 2.25rem);
  }

  .hero-card {
    padding: clamp(1.25rem, 3vw, 2.5rem);
  }

  .hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(320px, 1.05fr);
    gap: clamp(1.5rem, 4vw, 3rem);
    align-items: stretch;
  }

  .hero-copy {
    display: grid;
    align-content: center;
    gap: 1.25rem;
  }

  .hero-copy h2 {
    margin: 0;
    font-size: clamp(2.2rem, 4vw, 3.75rem);
    line-height: 1;
    letter-spacing: -0.04em;
    max-width: 13ch;
  }

  .hero-lede {
    margin: 0;
    max-width: 54ch;
    font-size: clamp(1rem, 1.3vw, 1.125rem);
    line-height: 1.65;
    color: rgba(58, 42, 34, 0.82);
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .sample-btn {
    min-height: 44px;
    padding: 0.7rem 1rem;
    border-radius: var(--pm-radius-sm);
    border: var(--pm-border-medium) solid var(--pm-black);
    background: var(--pm-yellow);
    color: var(--pm-black);
    box-shadow: 3px 3px 0 rgba(30, 23, 20, 0.18);
    font-size: var(--pm-text-sm);
    font-weight: 800;
    cursor: pointer;
  }

  .sample-btn:hover {
    transform: translateY(-1px);
    box-shadow: 4px 4px 0 rgba(30, 23, 20, 0.22);
  }

  .payoff-preview {
    display: grid;
    gap: 1rem;
    max-width: 32rem;
    padding-top: 0.5rem;
  }

  .preview-map {
    position: relative;
    min-height: 120px;
    border: var(--pm-border-medium) solid rgba(30, 23, 20, 0.16);
    border-radius: var(--pm-radius-md);
    background:
      linear-gradient(rgba(30, 23, 20, 0.08), rgba(30, 23, 20, 0.08)) 50% 50% /
        72% 2px no-repeat,
      linear-gradient(
        120deg,
        rgba(168, 216, 234, 0.32),
        rgba(255, 217, 184, 0.34)
      );
  }

  .preview-node {
    position: absolute;
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0.45rem 0.65rem;
    border-radius: var(--pm-radius-full);
    border: var(--pm-border-medium) solid var(--pm-black);
    background: var(--pm-cream-light);
    box-shadow: 2px 2px 0 rgba(30, 23, 20, 0.16);
    font-size: var(--pm-text-xs);
    font-weight: 800;
  }

  .node-a {
    left: 8%;
    top: 18%;
  }

  .node-b {
    right: 8%;
    top: 14%;
  }

  .node-c {
    left: 34%;
    bottom: 14%;
  }

  .preview-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .preview-list span {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0.35rem 0.6rem;
    border-radius: var(--pm-radius-full);
    background: rgba(255, 255, 255, 0.58);
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.12);
    font-size: var(--pm-text-xs);
    font-weight: 700;
    color: rgba(30, 23, 20, 0.76);
  }

  .hero-panel {
    min-width: 0;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.25rem;
  }

  .recent-projects {
    display: grid;
    gap: 1rem;
  }

  .recent-heading {
    display: grid;
    gap: 0.75rem;
  }

  .recent-heading h2 {
    margin: 0;
    font-size: clamp(1.4rem, 2.2vw, 2rem);
    letter-spacing: -0.03em;
  }

  .recent-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.9rem;
  }

  .recent-project {
    display: grid;
    gap: 0.35rem;
    min-height: 124px;
    padding: 1rem;
    border: var(--pm-border-medium) solid rgba(30, 23, 20, 0.14);
    border-radius: var(--pm-radius-sm);
    background: rgba(255, 247, 239, 0.74);
    box-shadow: var(--pm-shadow-soft);
    text-align: left;
    cursor: pointer;
  }

  .recent-project:hover {
    transform: translateY(-1px);
    border-color: rgba(30, 23, 20, 0.28);
    box-shadow: var(--pm-shadow-lifted);
  }

  .recent-project__title {
    font-weight: 800;
    color: var(--pm-black);
  }

  .recent-project__meta,
  .recent-project__summary {
    font-size: var(--pm-text-xs);
    line-height: 1.4;
    color: rgba(58, 42, 34, 0.68);
  }

  .recent-project__summary {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .feature-card {
    min-height: 200px;
  }

  .feature-card .card-body {
    height: 100%;
    display: grid;
    align-content: end;
    gap: 0.75rem;
    padding: 1.5rem;
    text-align: left;
  }

  .feature-icon {
    width: 3rem;
    height: 3rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.9rem;
    background: linear-gradient(
      135deg,
      rgba(232, 131, 156, 0.22),
      rgba(168, 216, 234, 0.28)
    );
    box-shadow: inset 0 0 0 1px rgba(30, 23, 20, 0.08);
    font-size: 1.4rem;
  }

  .feature-card h3 {
    margin: 0;
    font-size: clamp(1.15rem, 2vw, 1.35rem);
    letter-spacing: -0.04em;
  }

  .feature-card p {
    margin: 0;
    font-size: var(--pm-text-sm);
    line-height: 1.6;
    color: rgba(58, 42, 34, 0.72);
  }

  @media (max-width: 960px) {
    .hero-grid,
    .feature-grid {
      grid-template-columns: 1fr;
    }

    .hero-panel {
      order: -1;
    }

    .hero-copy h2 {
      max-width: 14ch;
    }
  }

  @media (max-width: 640px) {
    .app-header__inner {
      padding: 0.875rem 0 1rem;
    }

    .hero-card {
      padding: 1rem;
    }

    .hero-copy {
      gap: 1rem;
    }

    .hero-copy h2 {
      font-size: clamp(2rem, 9vw, 2.7rem);
      line-height: 1.04;
      max-width: 14ch;
    }

    .feature-card {
      min-height: 0;
    }

    .feature-card .card-body {
      padding: 1.25rem;
    }
  }
</style>
