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
    loadFromPartyKit,
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
  let filterMode: "all" | "starred" = "all";

  $: filteredProjects = filterMode === "all"
    ? $localProjects
    : $localProjects.filter(p => p.isStarred);

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
      // Try fetching from PartyKit Durable Storage first
      let sharedProject = await loadFromPartyKit(sharedProjectId);
      if (sharedProject) return;

      // Fallback to Supabase
      sharedProject = await loadFromSupabase(sharedProjectId);
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
        <div class="hero-grid">
          <div class="hero-copy">
            <h2>See what you're really saying</h2>
            <h3 class="hero-subheadline">Turn messy conversations into clear maps.</h3>
            <p class="hero-lede">
              Record, paste, or upload any conversation. Get instant summaries,
              action items, and visual topic maps. No signup. Everything stays
              private in your browser.
            </p>
            <div class="hero-actions">
              <button
                type="button"
                class="link-action-btn"
                on:click={loadSampleRant}
              >
                Try the weird science rant
              </button>
              <span class="action-divider">·</span>
              <button
                type="button"
                class="link-action-btn"
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
          </div>
          <div class="hero-panel">
            <Upload
              initialText={starterText}
              initialTextKey={starterTextKey}
            />
          </div>
        </div>
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
          <div class="drawer-tabs">
            <button
              type="button"
              class="drawer-tab"
              class:active={filterMode === "all"}
              on:click={() => (filterMode = "all")}
            >
              All ({$localProjects.length})
            </button>
            <button
              type="button"
              class="drawer-tab"
              class:active={filterMode === "starred"}
              on:click={() => (filterMode = "starred")}
            >
              ★ Starred ({$localProjects.filter((p) => p.isStarred).length})
            </button>
          </div>

          <div class="history-drawer__list">
            {#if filteredProjects.length === 0}
              <p class="empty-state">No starred projects found</p>
            {:else}
              {#each filteredProjects as project}
                <button
                  type="button"
                  class="history-drawer-item"
                  on:click={() => {
                    loadLocalProject(project.id);
                    historyOpen = false;
                  }}
                >
                  <div class="history-drawer-item__title">
                    {project.title}
                    {#if project.isStarred}
                      <span class="star-indicator">★</span>
                    {/if}
                  </div>
                  <div class="history-drawer-item__meta">
                    {project.isPublic ? "Shared" : project.syncEnabled ? "Cloud save" : "Local"} · {formatProjectDate(project.updatedAt)}
                  </div>
                  {#if project.summary}
                    <div class="history-drawer-item__summary">{project.summary}</div>
                  {/if}
                </button>
              {/each}
            {/if}
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

  .hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
    gap: clamp(1.5rem, 5vw, 4.5rem);
    align-items: center;
    padding: clamp(1rem, 4vh, 4rem) 0;
  }

  .hero-copy {
    display: grid;
    align-content: center;
    gap: 1.25rem;
  }

  .hero-copy h2 {
    margin: 0;
    font-size: clamp(2.4rem, 4.5vw, 4rem);
    line-height: 1.06;
    letter-spacing: -0.04em;
    font-weight: 800;
  }

  .hero-subheadline {
    margin: 0;
    font-size: clamp(1.25rem, 2.2vw, 1.75rem);
    font-weight: 700;
    color: var(--pm-brown);
    letter-spacing: -0.02em;
    line-height: 1.2;
    opacity: 0.9;
  }

  .hero-lede {
    margin: 0;
    max-width: 52ch;
    font-size: clamp(0.95rem, 1.2vw, 1.06rem);
    line-height: 1.6;
    color: var(--pm-brown);
    opacity: 0.8;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.65rem;
    margin-top: 0.25rem;
  }

  .link-action-btn {
    border: none;
    background: transparent;
    padding: 0;
    font-size: var(--pm-text-sm);
    font-weight: 700;
    color: var(--pm-brown);
    text-decoration: underline;
    text-decoration-thickness: 1.5px;
    cursor: pointer;
    transition: color var(--pm-transition-fast);
  }

  .link-action-btn:hover {
    color: var(--pm-black);
  }

  .action-divider {
    color: var(--pm-brown);
    opacity: 0.4;
    font-weight: bold;
    user-select: none;
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

  .hero-panel {
    min-width: 0;
  }

  @media (max-width: 960px) {
    .hero-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .hero-panel {
      order: -1;
    }
  }

  @media (max-width: 640px) {
    .app-header__inner {
      padding: 0.875rem 0 1rem;
    }

    .hero-copy {
      gap: 1rem;
    }

    .hero-copy h2 {
      font-size: clamp(2.1rem, 9vw, 2.8rem);
      line-height: 1.04;
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

  /* Star and Tab Drawer styles */
  .drawer-tabs {
    display: flex;
    gap: 0.45rem;
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--pm-black);
    padding-bottom: 0.5rem;
  }

  .drawer-tab {
    flex: 1;
    min-height: 38px;
    padding: 0.4rem 0.65rem;
    border-radius: var(--pm-radius-sm);
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.2);
    background: transparent;
    color: var(--pm-brown);
    font-size: var(--pm-text-xs);
    font-weight: 700;
    cursor: pointer;
    transition: all var(--pm-transition-fast);
  }

  .drawer-tab:hover {
    background: rgba(30, 23, 20, 0.05);
  }

  .drawer-tab.active {
    background: var(--pm-black);
    color: var(--pm-cream);
    border-color: var(--pm-black);
  }

  .star-indicator {
    color: var(--pm-yellow);
    margin-left: 0.35rem;
    font-size: 1.1rem;
    display: inline-block;
    line-height: 1;
    text-shadow: 0 0 2px rgba(30, 23, 20, 0.15);
  }
</style>
