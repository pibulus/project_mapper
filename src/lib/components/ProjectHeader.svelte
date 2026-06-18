<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Upload from "./Upload.svelte";
  import {
    enableSync,
    localSaveError,
    saveStatus,
    updateProject,
  } from "$lib/stores/projectStore";
  import { downloadProjectBackup } from "$lib/client/projectBackup";
  import type { ConversationData } from "$lib/core/types/project";
  import { cycleTheme } from "$lib/stores/themeStore";

  export let project: ConversationData | null = null;

  const dispatch = createEventDispatcher<{
    back: void;
    export: void;
  }>();

  let isEditingTitle = false;
  let titleInput = project?.title || "";
  let isSavingTitle = false;
  let isRegenerating = false;
  let isSharing = false;
  let titleError = "";
  let shareMessage = "";
  let shareUrl = "";
  let appendPanelOpen = false;

  $: if (!isEditingTitle) {
    titleInput = project?.title || "";
  }
  $: syncLabel = $localSaveError
    ? "Local save issue"
    : getSyncLabel(project, $saveStatus);
  $: syncTone = $localSaveError ? "error" : getSyncTone(project, $saveStatus);
  $: syncStatusTitle =
    $localSaveError ||
    (project?.syncEnabled ? "Cloud save status" : "Local browser only");

  function beginEdit() {
    if (!project) return;
    titleInput = project.title || "";
    isEditingTitle = true;
    titleError = "";
  }

  function cancelEdit() {
    isEditingTitle = false;
    titleInput = project?.title || "";
    titleError = "";
  }

  async function saveTitle() {
    if (!project) return;
    const trimmed = titleInput.trim();
    if (!trimmed) {
      titleError = "Title cannot be empty";
      return;
    }
    if (trimmed === project.title) {
      isEditingTitle = false;
      return;
    }
    isSavingTitle = true;
    updateProject({ title: trimmed });
    isSavingTitle = false;
    isEditingTitle = false;
  }

  async function regenerateTitle() {
    if (!project?.transcript) {
      titleError = "Need a transcript before generating a title";
      return;
    }
    try {
      isRegenerating = true;
      titleError = "";
      const response = await fetch("/api/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: project.transcript }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate title");
      }
      const data = await response.json();
      if (data?.title) {
        updateProject({ title: data.title });
      }
      titleError = data?.warning || "";
    } catch (err: any) {
      console.error(err);
      titleError = err?.message || "Unable to generate title";
    } finally {
      isRegenerating = false;
    }
  }

  async function shareProject() {
    if (!project) return;

    try {
      isSharing = true;
      shareMessage = "";
      shareUrl = "";
      const success = await enableSync(project, { isPublic: true });
      if (!success) {
        throw new Error("Could not publish this project");
      }

      const url = new URL(window.location.href);
      url.searchParams.set("project", project.id);
      url.hash = "";

      shareUrl = url.toString();
      await copyShareUrl();
    } catch (err: any) {
      console.error(err);
      shareMessage = err?.message || "Could not copy share link";
    } finally {
      isSharing = false;
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      shareMessage = "Public link copied";
    } catch {
      shareMessage = "Public link ready. Copy manually.";
    }
  }

  function backupProject() {
    if (!project) return;
    downloadProjectBackup(project);
    shareUrl = "";
    shareMessage = "Backup downloaded";
  }

  function closeAppendPanel() {
    appendPanelOpen = false;
  }

  function handleAppendComplete() {
    appendPanelOpen = false;
    shareUrl = "";
    shareMessage = "Project updated";
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && appendPanelOpen) {
      closeAppendPanel();
    }
  }

  function getSyncLabel(
    current: ConversationData | null,
    status: "saved" | "saving" | "error",
  ) {
    if (!current?.syncEnabled) return "Saved locally";
    if (status === "saving") return "Saving";
    if (status === "error") return "Sync issue";
    return current.isPublic ? "Shared" : "Cloud saved";
  }

  function getSyncTone(
    current: ConversationData | null,
    status: "saved" | "saving" | "error",
  ) {
    if (!current?.syncEnabled) return "local";
    if (status === "error") return "error";
    if (status === "saving") return "saving";
    return "success";
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

{#if project}
  <header class="project-header">
    <div class="header-left">
      <button
        class="back-btn"
        on:click={() => dispatch("back")}
        aria-label="Back to home"
      >
        ←
      </button>
      <div class="title-stack">
        {#if isEditingTitle}
          <div class="title-edit">
            <input
              class="title-input"
              type="text"
              bind:value={titleInput}
              maxlength="120"
              placeholder="Project title"
            />
            <div class="edit-actions">
              <button class="pill-btn" on:click={cancelEdit} type="button"
                >Cancel</button
              >
              <button
                class="pill-btn pill-solid"
                on:click={saveTitle}
                type="button"
                disabled={isSavingTitle}
              >
                {isSavingTitle ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        {:else}
          <div class="title-display">
            <h1>{project.title || "Untitled Project"}</h1>
            <button
              class="star-toggle-btn"
              class:starred={project.isStarred}
              on:click={() => updateProject({ isStarred: !project.isStarred })}
              type="button"
              title={project.isStarred ? "Unstar project" : "Star project"}
              aria-label={project.isStarred ? "Unstar project" : "Star project"}
            >
              {project.isStarred ? "★" : "☆"}
            </button>
            <button class="ghost-btn" on:click={beginEdit} type="button"
              >Rename</button
            >
            <div class="mobile-sync-status" title={syncStatusTitle}>
              <span class="status-dot {syncTone}"></span>
              <span class="status-text">{syncLabel}</span>
            </div>
            <button
              class="ghost-btn"
              on:click={regenerateTitle}
              type="button"
              disabled={isRegenerating}
            >
              {isRegenerating ? "Generating…" : "AI Title"}
            </button>
          </div>
        {/if}
        {#if titleError}
          <p class="title-error">{titleError}</p>
        {/if}
        {#if $localSaveError}
          <span class="mobile-local-save-warning" role="status">
            Backup before refresh
          </span>
        {/if}
      </div>
    </div>
    <div class="header-right">
      <div class="sync-status" title={syncStatusTitle}>
        <span class="status-dot {syncTone}"></span>
        <span class="status-text">{syncLabel}</span>
      </div>
      {#if $localSaveError}
        <span class="local-save-warning" role="status">
          Backup before refresh
        </span>
      {/if}
      <button
        class="pill-btn"
        on:click={() => (appendPanelOpen = true)}
        type="button"
        title="Record or upload audio to update this project"
      >
        Append
      </button>
      <button
        class="pill-btn"
        on:click={shareProject}
        type="button"
        disabled={isSharing}
        title="Publish a public-by-link demo copy and copy the URL"
      >
        {isSharing ? "Sharing..." : "Share"}
      </button>
      <button
        class="pill-btn"
        on:click={backupProject}
        type="button"
        title="Download a portable project backup"
      >
        Backup
      </button>
      <button class="pill-btn pill-solid" on:click={() => dispatch("export")}
        >Export</button
      >
      <button
        class="theme-toggle-btn"
        on:click={cycleTheme}
        type="button"
        title="Cycle color theme"
        aria-label="Cycle color theme"
      >
        🎨
      </button>
      {#if shareMessage}
        <span class="share-message">{shareMessage}</span>
      {/if}
      {#if shareUrl}
        <div class="share-url-row">
          <input readonly value={shareUrl} aria-label="Public share URL" />
          <button type="button" class="pill-btn" on:click={copyShareUrl}>
            Copy
          </button>
        </div>
      {/if}
    </div>
  </header>
  {#if appendPanelOpen}
    <div
      class="append-backdrop"
      role="button"
      tabindex="0"
      aria-label="Close append panel"
      on:click={closeAppendPanel}
      on:keydown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          closeAppendPanel();
        }
      }}
    ></div>
    <div
      class="append-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Append audio to project"
    >
      <div class="append-panel__header">
        <div>
          <p class="append-panel__kicker">Append to project</p>
          <h2>Record the next update</h2>
        </div>
        <button
          type="button"
          class="append-panel__close"
          on:click={closeAppendPanel}
          aria-label="Close append panel"
        >
          ×
        </button>
      </div>
      <Upload appendAudioOnly={true} on:appendComplete={handleAppendComplete} />
    </div>
  {/if}
{/if}

<style>
  .star-toggle-btn {
    border: none;
    background: transparent;
    font-size: 1.45rem;
    color: rgba(30, 23, 20, 0.28);
    cursor: pointer;
    transition: all var(--pm-transition-fast);
    padding: 0.1rem 0.25rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .star-toggle-btn:hover {
    color: var(--pm-yellow);
    transform: scale(1.15);
  }

  .star-toggle-btn.starred {
    color: var(--pm-yellow);
    text-shadow: 0 0 4px rgba(255, 244, 79, 0.45);
  }

  .project-header {
    background: var(--pm-glass-bg);
    backdrop-filter: blur(var(--pm-glass-blur));
    -webkit-backdrop-filter: blur(var(--pm-glass-blur));
    border-bottom: var(--pm-border-medium) solid rgba(30, 23, 20, 0.08);
    box-shadow: var(--pm-shadow-soft);
    min-height: 88px;
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    gap: 1rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
    flex: 1;
  }

  .back-btn {
    border: var(--pm-border-medium) solid rgba(30, 23, 20, 0.2);
    background: white;
    border-radius: var(--pm-radius-full);
    width: 44px;
    height: 44px;
    font-size: 1.25rem;
    cursor: pointer;
    box-shadow: 2px 2px 0 rgba(30, 23, 20, 0.1);
  }

  .title-stack {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .title-display {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .title-display h1 {
    font-size: clamp(1.4rem, 2vw, 1.8rem);
    font-weight: 800;
    color: var(--pm-black);
    letter-spacing: 0;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title-edit {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .title-input {
    font-size: var(--pm-text-lg);
    font-weight: 700;
    padding: 0.5rem 0.75rem;
    border-radius: var(--pm-radius-md);
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.3);
    min-width: 260px;
  }

  .edit-actions {
    display: inline-flex;
    gap: 0.35rem;
  }

  .pill-btn {
    border-radius: var(--pm-radius-full);
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.25);
    background: white;
    min-height: 44px;
    padding: 0.55rem 0.95rem;
    font-size: var(--pm-text-xs);
    font-weight: 600;
    cursor: pointer;
  }

  .pill-solid {
    background: var(--pm-black);
    color: white;
    border-color: var(--pm-black);
  }

  .ghost-btn {
    border: none;
    background: transparent;
    min-height: 44px;
    padding: 0.45rem 0.25rem;
    font-size: var(--pm-text-xs);
    font-weight: 600;
    color: rgba(30, 23, 20, 0.7);
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .header-right {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .title-error {
    font-size: var(--pm-text-xs);
    color: var(--pm-pink);
    margin: 0;
  }

  .mobile-sync-status,
  .mobile-local-save-warning {
    display: none;
  }

  @media (max-width: 768px) {
    .project-header {
      flex-direction: column;
      align-items: flex-start;
      min-height: 0;
      padding: 0.7rem 0.75rem 0.8rem;
      gap: 0.55rem;
    }

    .header-left {
      width: 100%;
      align-items: flex-start;
      gap: 0.65rem;
    }

    .back-btn {
      width: 40px;
      height: 40px;
      margin-top: 0.1rem;
    }

    .title-stack {
      flex: 1;
      width: calc(100% - 3rem);
    }

    .title-display {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      width: 100%;
      gap: 0.2rem 0.55rem;
    }

    .title-display h1 {
      grid-column: 1 / -1;
      font-size: 1.2rem;
      line-height: 1.15;
    }

    .ghost-btn {
      min-height: 32px;
      padding: 0;
      font-size: 0.67rem;
    }

    .header-right {
      width: 100%;
      justify-content: flex-start;
      flex-wrap: nowrap;
      gap: 0.45rem;
      overflow-x: auto;
      padding-bottom: 0.1rem;
      scrollbar-width: none;
    }

    .header-right::-webkit-scrollbar {
      display: none;
    }
  }

  .sync-status {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 44px;
    font-size: var(--pm-text-xs);
    font-weight: 600;
    color: rgba(30, 23, 20, 0.6);
    margin-right: 0.5rem;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .status-dot.success {
    background: var(--pm-mint);
    box-shadow: 0 0 0 2px rgba(168, 216, 234, 0.2);
  }

  .status-dot.local {
    background: rgba(30, 23, 20, 0.2);
  }

  .status-dot.saving {
    background: var(--pm-yellow);
    box-shadow: 0 0 0 2px rgba(255, 244, 79, 0.22);
  }

  .status-dot.error {
    background: var(--pm-pink);
    box-shadow: 0 0 0 2px rgba(232, 131, 156, 0.22);
  }

  .share-message {
    font-size: var(--pm-text-xs);
    color: rgba(30, 23, 20, 0.68);
  }

  .local-save-warning {
    flex: 1 1 100%;
    min-height: 38px;
    display: inline-flex;
    align-items: center;
    width: fit-content;
    border: var(--pm-border-thin) solid rgba(232, 131, 156, 0.35);
    border-radius: var(--pm-radius-full);
    background: rgba(255, 214, 224, 0.44);
    padding: 0.35rem 0.7rem;
    color: rgba(122, 40, 62, 0.92);
    font-size: var(--pm-text-xs);
    font-weight: 800;
  }

  .share-url-row {
    flex: 1 1 100%;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .share-url-row input {
    min-width: 0;
    flex: 1;
    min-height: 44px;
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.18);
    border-radius: var(--pm-radius-sm);
    background: rgba(255, 255, 255, 0.7);
    padding: 0.5rem 0.65rem;
    color: rgba(30, 23, 20, 0.72);
    font-size: var(--pm-text-xs);
  }

  .append-backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    background: rgba(30, 23, 20, 0.48);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .append-panel {
    position: fixed;
    top: clamp(1rem, 4vh, 2.5rem);
    left: 50%;
    z-index: 81;
    width: min(calc(100vw - 1.5rem), 560px);
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    transform: translateX(-50%);
    border: var(--pm-border-medium) solid var(--pm-black);
    border-radius: var(--pm-radius-lg);
    background: var(--pm-cream);
    box-shadow: var(--pm-shadow-slab-lg);
    padding: 1rem;
  }

  .append-panel__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .append-panel__kicker {
    margin: 0 0 0.25rem;
    color: rgba(58, 42, 34, 0.62);
    font-size: var(--pm-text-xs);
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .append-panel__header h2 {
    margin: 0;
    color: var(--pm-black);
    font-size: var(--pm-text-xl);
    font-weight: 800;
    letter-spacing: 0;
  }

  .append-panel__close {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.18);
    border-radius: var(--pm-radius-full);
    background: white;
    color: var(--pm-black);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
  }

  @media (max-width: 640px) {
    .project-header {
      padding-inline: 0.65rem;
    }

    .title-edit {
      flex-direction: column;
      align-items: stretch;
    }

    .title-input {
      min-width: 0;
      width: 100%;
    }

    .edit-actions {
      justify-content: flex-end;
    }

    .sync-status {
      display: none;
    }

    .mobile-sync-status {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      width: fit-content;
      min-height: 30px;
      border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.12);
      border-radius: var(--pm-radius-full);
      background: rgba(255, 255, 255, 0.68);
      padding: 0 0.6rem;
      color: rgba(30, 23, 20, 0.62);
      font-size: 0.75rem;
      font-weight: 700;
    }

    .local-save-warning {
      display: none;
    }

    .mobile-local-save-warning {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      min-height: 30px;
      border: var(--pm-border-thin) solid rgba(232, 131, 156, 0.35);
      border-radius: var(--pm-radius-full);
      background: rgba(255, 214, 224, 0.44);
      padding: 0 0.6rem;
      color: rgba(122, 40, 62, 0.92);
      font-size: 0.75rem;
      font-weight: 800;
    }

    .pill-btn {
      flex: 0 0 auto;
      padding-inline: 0.7rem;
      font-size: 0.82rem;
    }

    .share-message,
    .local-save-warning {
      flex: 0 0 auto;
      white-space: nowrap;
    }

    .share-url-row {
      flex: 0 0 min(92vw, 24rem);
    }
  }
</style>
