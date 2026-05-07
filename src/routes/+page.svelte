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
    currentProject,
    loadFromLocalStorage,
  } from "$lib/stores/projectStore";
  import Upload from "$lib/components/Upload.svelte";
  import Dashboard from "$lib/components/Dashboard.svelte";
  import ExportDrawer from "$lib/components/ExportDrawer.svelte";
  import TopicTooltip from "$lib/components/TopicTooltip.svelte";
  import ProjectHeader from "$lib/components/ProjectHeader.svelte";

  let exportDrawerOpen = false;

  // Auto-restore from localStorage on mount
  onMount(() => {
    loadFromLocalStorage();
  });
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
      on:back={() => ($currentProject = null)}
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
    {#if $currentProject}
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
                Record, paste, or upload. ProMapper pulls out the transcript,
                summary, tasks, and topics.
              </p>
            </div>
            <div class="hero-panel">
              <Upload />
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

  <!-- Export Drawer -->
  <ExportDrawer
    bind:isOpen={exportDrawerOpen}
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
</style>
