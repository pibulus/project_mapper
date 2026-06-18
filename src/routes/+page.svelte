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
    setCurrentProject,
  } from "$lib/stores/projectStore";
  import { readProjectBackupFile } from "$lib/client/projectBackup";
  import Upload from "$lib/components/Upload.svelte";
  import Dashboard from "$lib/components/Dashboard.svelte";
  import ExportDrawer from "$lib/components/ExportDrawer.svelte";
  import TopicTooltip from "$lib/components/TopicTooltip.svelte";
  import ProjectHeader from "$lib/components/ProjectHeader.svelte";
  import { fade, fly } from "svelte/transition";
  import { cycleTheme } from "$lib/stores/themeStore";

  let exportDrawerOpen = false;
  let historyOpen = false;
  let starterText = "";
  let starterTextKey = 0;
  let importInput: HTMLInputElement | null = null;
  let importError = "";

  function toggleHistory() {
    historyOpen = !historyOpen;
  }

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
    importError = "";
  }

  function openImportDialog() {
    importInput?.click();
  }

  async function handleImportBackup(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      importError = "";
      const project = await readProjectBackupFile(file);
      setCurrentProject(project);
    } catch (err: any) {
      importError = err?.message || "Could not import that backup.";
    } finally {
      input.value = "";
    }
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
    <header class="app-header transparent-header">
      <div class="shell app-header__inner flex-header">
        <div class="landing-header__brand">
          Conversation Mapper
        </div>
        <button
          type="button"
          class="theme-toggle-btn"
          on:click={cycleTheme}
          title="Cycle color theme"
          aria-label="Cycle color theme"
        >
          🎨
        </button>
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
              <h2>See what you're really saying</h2>
              <p class="hero-lede">
                Build a confident map for every conversation—stable layout,
                playful controls, no resizing jump scares when you switch modes.
              </p>
              <p class="hero-subtext">
                Record / Paste / Upload — same module, same rhythm.
              </p>
              <div class="hero-actions">
                <button
                  type="button"
                  class="sample-btn"
                  on:click={loadSampleRant}
                >
                  Try the weird science rant
                </button>
                <button
                  type="button"
                  class="sample-btn sample-btn--secondary"
                  on:click={openImportDialog}
                >
                  Import backup
                </button>
                <input
                  bind:this={importInput}
                  class="visually-hidden"
                  type="file"
                  accept="application/json,.json,.promapper.json"
                  on:change={handleImportBackup}
                  aria-label="Import project backup"
                />
              </div>
              {#if importError}
                <p class="import-error">{importError}</p>
              {/if}
              <div class="payoff-preview" aria-label="Example project output">
                <div class="preview-map">
                  <span class="preview-node node-a">🔍 Silk yield</span>
                  <span class="preview-node node-b">⚖️ Bioethics</span>
                  <span class="preview-node node-c">📢 Public story</span>
                </div>
                <div class="preview-list">
                  <span>✓ Extract tasks</span>
                  <span>↳ Connection map</span>
                  <span>MD Draft article</span>
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

  <!-- Floating History Button -->
  {#if !$currentProject && $localProjects.length}
    <button
      type="button"
      class="history-float-btn"
      on:click={toggleHistory}
      title="View history"
      aria-label="View local project history"
    >
      📂 History
    </button>
  {/if}

  <!-- History Drawer -->
  {#if historyOpen && !$currentProject}
    <div
      class="history-backdrop"
      on:click={toggleHistory}
      on:keydown={(e) => (e.key === "Escape" || e.key === "Enter") && toggleHistory()}
      transition:fade={{ duration: 200 }}
      role="button"
      tabindex="0"
      aria-label="Close history"
    ></div>

    <div
      class="history-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Recent project history"
      transition:fly={{ x: 400, duration: 300 }}
    >
      <div class="history-drawer__header">
        <h2>Recent work</h2>
        <button
          type="button"
          class="history-drawer__close"
          on:click={toggleHistory}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div class="history-drawer__content">
        {#if $localProjects.length === 0}
          <p class="empty-state">No local project history found</p>
        {:else}
          <div class="history-drawer__list">
            {#each $localProjects as project}
              <button
                type="button"
                class="history-drawer-item"
                on:click={() => {
                  loadLocalProject(project.id);
                  historyOpen = false;
                }}
              >
                <div class="history-drawer-item__title">{project.title}</div>
                <div class="history-drawer-item__meta">
                  {project.isPublic ? "Shared" : project.syncEnabled ? "Cloud save" : "Local"} · {formatProjectDate(project.updatedAt)}
                </div>
                {#if project.summary}
                  <div class="history-drawer-item__summary">{project.summary}</div>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}

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

  .sample-btn--secondary {
    background: var(--pm-cream-light);
    border-color: rgba(30, 23, 20, 0.28);
    box-shadow: 2px 2px 0 rgba(30, 23, 20, 0.12);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .import-error {
    margin: -0.35rem 0 0;
    color: #b91c1c;
    font-size: var(--pm-text-sm);
    font-weight: 700;
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

  /* Transparent header styles */
  .transparent-header {
    background: transparent !important;
    border-bottom: none !important;
    box-shadow: none !important;
  }

  .flex-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 1.5rem 1rem 0;
  }

  .landing-header__brand {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--pm-black);
    letter-spacing: -0.03em;
  }

  .hero-subtext {
    font-size: var(--pm-text-sm);
    color: var(--pm-brown);
    opacity: 0.8;
    margin: -0.25rem 0 0.5rem;
    font-weight: 600;
  }

  /* History Floating Button styles */
  .history-float-btn {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    min-height: 48px;
    padding: 0 1.25rem;
    border-radius: var(--pm-radius-full);
    border: var(--pm-border-medium) solid var(--pm-black);
    background: var(--pm-yellow);
    color: var(--pm-black);
    font-size: var(--pm-text-sm);
    font-weight: 800;
    box-shadow: var(--pm-shadow-slab);
    cursor: pointer;
    transition: all var(--pm-transition-fast);
    z-index: 35;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .history-float-btn:hover {
    transform: translateY(-2px);
    box-shadow: 6px 6px 0 var(--pm-black);
  }

  .history-float-btn:active {
    transform: translateY(0);
  }

  /* History Drawer styles */
  .history-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(30, 23, 20, 0.42);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }

  .history-drawer {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 50;
    width: min(100%, 420px);
    height: 100%;
    overflow-y: auto;
    border-left: var(--pm-border-medium) solid var(--pm-black);
    background: linear-gradient(180deg, var(--pm-cream-light) 0%, var(--pm-cream) 100%);
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
  }

  .history-drawer__header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: var(--pm-border-medium) solid var(--pm-black);
    background: var(--pm-cream-light);
    padding: 1.25rem;
  }

  .history-drawer__header h2 {
    margin: 0;
    color: var(--pm-black);
    font-size: var(--pm-text-xl);
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .history-drawer__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.15);
    border-radius: var(--pm-radius-sm);
    background: white;
    color: var(--pm-black);
    font-size: 1rem;
    cursor: pointer;
    transition: all var(--pm-transition-fast);
  }

  .history-drawer__close:hover {
    background: var(--pm-cream-dark);
    transform: translateY(-1px);
  }

  .history-drawer__content {
    padding: 1.25rem;
  }

  .history-drawer__list {
    display: grid;
    gap: 0.9rem;
  }

  .history-drawer-item {
    display: grid;
    gap: 0.35rem;
    padding: 1rem;
    border: var(--pm-border-medium) solid var(--pm-black);
    border-radius: var(--pm-radius-sm);
    background: var(--pm-cream-light);
    box-shadow: var(--pm-shadow-slab);
    text-align: left;
    cursor: pointer;
    transition: all var(--pm-transition-fast);
  }

  .history-drawer-item:hover {
    transform: translateY(-2px);
    box-shadow: 6px 6px 0 var(--pm-black);
    background: white;
  }

  .history-drawer-item__title {
    font-weight: 800;
    color: var(--pm-black);
    font-size: var(--pm-text-md);
  }

  .history-drawer-item__meta {
    font-size: var(--pm-text-xs);
    color: var(--pm-brown);
    opacity: 0.7;
    font-weight: 600;
  }

  .history-drawer-item__summary {
    font-size: var(--pm-text-xs);
    color: var(--pm-brown);
    opacity: 0.8;
    line-height: 1.4;
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
</style>
