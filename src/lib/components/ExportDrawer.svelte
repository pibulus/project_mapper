<script lang="ts">
  /**
   * ExportDrawer Component
   *
   * Right-hand slide-in drawer for exporting conversation to different formats
   * Combines the best from both versions:
   * - Svelte transitions for smooth animations
   * - Format system from Fresh
   */
  import { fade, fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { EXPORT_FORMATS } from "$lib/core/export/formats";
  import { updateProject } from "$lib/stores/projectStore";
  import type { ConversationData, ExportDraft } from "$lib/core/types";

  export let isOpen = false;
  export let transcript = "";
  export let project: ConversationData | null = null;

  type ExportFormatId = keyof typeof EXPORT_FORMATS | "CUSTOM";
  type ExportOption = {
    id: ExportFormatId;
    label: string;
    desc: string;
    custom?: boolean;
  };

  let selectedFormat: ExportOption | null = null;
  let generatedMarkdown = "";
  let customPrompt = "";
  let activeDraftId = "";
  let isGenerating = false;
  let error = "";
  let copyStatus = "";
  let exportRequestSeq = 0;
  $: exportTranscript = project?.transcript || transcript;
  $: savedDrafts = project?.exportDrafts || [];

  // Available export formats with descriptions
  const formats: ExportOption[] = [
    {
      id: "BLOG",
      label: "📝 Blog Post",
      desc: "Formatted article with sections",
    },
    {
      id: "MEETING",
      label: "🗓️ Meeting Minutes",
      desc: "Decisions, discussion, and tasks",
    },
    {
      id: "PLAN",
      label: "✅ Action Plan",
      desc: "Tasks, owners, and timeframes",
    },
    {
      id: "SUMMARY",
      label: "📋 Executive Summary",
      desc: "High-level overview",
    },
    {
      id: "RESEARCH",
      label: "🔎 Research Notes",
      desc: "Findings and follow-up areas",
    },
    {
      id: "SPECIFICATIONS",
      label: "🧩 Specifications",
      desc: "Requirements and implementation notes",
    },
    {
      id: "TECHNICAL_MANUAL",
      label: "📖 Technical Manual",
      desc: "Step-by-step guide",
    },
    {
      id: "JOURNAL",
      label: "📓 Journal Entry",
      desc: "Reflective narrative output",
    },
    {
      id: "REPORT",
      label: "📊 Case Study",
      desc: "Situation, solution, and lessons",
    },
    { id: "HAIKU", label: "🎋 Haiku", desc: "Poetic compact summary" },
    {
      id: "CUSTOM",
      label: "✍️ Custom Prompt",
      desc: "Write your own transform",
      custom: true,
    },
  ];

  function selectFormat(format: ExportOption) {
    selectedFormat = format;
    generatedMarkdown = "";
    error = "";
    copyStatus = "";
    activeDraftId = "";

    if (!format.custom) {
      generateExport(format);
    }
  }

  async function generateExport(format: ExportOption) {
    if (
      !exportTranscript &&
      !project?.summary &&
      !project?.actionItems?.length
    ) {
      error = "No project content available";
      return;
    }

    if (format.custom && !customPrompt.trim()) {
      error = "Write a custom prompt first";
      return;
    }

    selectedFormat = format;
    isGenerating = true;
    error = "";
    copyStatus = "";
    generatedMarkdown = "";
    activeDraftId = "";
    const requestSeq = ++exportRequestSeq;
    const requestedFormatId = format.id;

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: exportTranscript,
          project,
          format: format.id,
          customPrompt: format.custom ? customPrompt : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate export");
      }

      const result = await response.json();
      if (
        requestSeq !== exportRequestSeq ||
        !isOpen ||
        selectedFormat?.id !== requestedFormatId
      ) {
        return;
      }
      generatedMarkdown = result.markdown;
    } catch (err: any) {
      if (requestSeq !== exportRequestSeq) return;
      console.error("Error generating export:", err);
      error = err.message || "Failed to generate export";
    } finally {
      if (requestSeq === exportRequestSeq) {
        isGenerating = false;
      }
    }
  }

  async function copyToClipboard() {
    if (!generatedMarkdown) return;

    if (!navigator.clipboard?.writeText) {
      copyStatus = "";
      error = "Clipboard unavailable. Select and copy the markdown manually.";
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedMarkdown);
      copyStatus = "Copied to clipboard";
      error = "";
    } catch (err) {
      console.error("Failed to copy:", err);
      copyStatus = "";
      error = "Could not copy. Select and copy the markdown manually.";
    }
  }

  function saveDraft() {
    if (!project || !selectedFormat || !generatedMarkdown.trim()) return;

    const now = new Date().toISOString();
    const nextDraft: ExportDraft = {
      id: activeDraftId || crypto.randomUUID(),
      format: selectedFormat.id,
      label: selectedFormat.label,
      content: generatedMarkdown,
      prompt: selectedFormat.custom ? customPrompt.trim() : undefined,
      createdAt:
        savedDrafts.find((draft) => draft.id === activeDraftId)?.createdAt ||
        now,
      updatedAt: now,
    };

    const nextDrafts = [
      nextDraft,
      ...savedDrafts.filter((draft) => draft.id !== nextDraft.id),
    ].slice(0, 20);

    activeDraftId = nextDraft.id;
    updateProject({ exportDrafts: nextDrafts });
    copyStatus = "Draft saved";
  }

  function loadDraft(draft: ExportDraft) {
    const format =
      formats.find((item) => item.id === draft.format) ||
      formats.find((item) => item.id === "CUSTOM");
    if (!format) return;

    selectedFormat = format;
    generatedMarkdown = draft.content;
    customPrompt = draft.prompt || "";
    activeDraftId = draft.id;
    error = "";
    copyStatus = "Draft loaded";
  }

  function deleteDraft(draftId: string) {
    updateProject({
      exportDrafts: savedDrafts.filter((draft) => draft.id !== draftId),
    });
    if (activeDraftId === draftId) {
      activeDraftId = "";
      copyStatus = "Draft deleted";
    }
  }

  function draftPreview(content: string) {
    return (
      content
        .replace(/^#+\s*/gm, "")
        .replace(/[*_`>#-]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 140) || "No preview"
    );
  }

  function formatDraftDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function downloadMarkdown() {
    if (!generatedMarkdown) return;

    const blob = new Blob([generatedMarkdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(project?.title || selectedFormat?.label || "project-export")}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function slugify(value: string) {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80) || "project-export"
    );
  }

  function handleClose() {
    isOpen = false;
    exportRequestSeq += 1;
    isGenerating = false;
    // Reset state after animation
    setTimeout(() => {
      selectedFormat = null;
      generatedMarkdown = "";
      error = "";
      copyStatus = "";
      customPrompt = "";
      activeDraftId = "";
    }, 300);
  }

  // Handle ESC key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isOpen) {
      handleClose();
    }
  }

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="export-backdrop"
    on:click={handleClose}
    on:keydown={handleBackdropKeydown}
    transition:fade={{ duration: 200 }}
    role="button"
    tabindex="0"
    aria-label="Close drawer"
  ></div>

  <!-- Drawer -->
  <div
    class="export-drawer"
    role="dialog"
    aria-modal="true"
    aria-label="Export project"
    transition:fly={{ x: 500, duration: 300, easing: cubicOut }}
  >
    <!-- Header -->
    <div class="export-drawer__header">
      <h2>Export Project</h2>
      <button
        type="button"
        on:click={handleClose}
        class="export-drawer__close"
        aria-label="Close"
      >
        ✕
      </button>
    </div>

    <!-- Content -->
    <div class="export-drawer__content">
      {#if !selectedFormat}
        <!-- Format Selection -->
        <div class="format-list">
          <p class="export-drawer__hint">Choose an export format</p>
          {#each formats as format}
            <button
              type="button"
              on:click={() => selectFormat(format)}
              class="format-option"
            >
              <div class="format-option__inner">
                <div>
                  <div class="format-option__label">{format.label}</div>
                  <div class="format-option__desc">{format.desc}</div>
                </div>
                <div class="format-option__arrow">→</div>
              </div>
            </button>
          {/each}
        </div>
      {:else}
        <!-- Generated Output -->
        <div class="export-workspace">
          <!-- Back button -->
          <button
            type="button"
            on:click={() => {
              exportRequestSeq += 1;
              selectedFormat = null;
              generatedMarkdown = "";
              error = "";
              copyStatus = "";
              activeDraftId = "";
              isGenerating = false;
            }}
            class="drawer-back"
          >
            ← Back to formats
          </button>

          {#if isGenerating}
            <!-- Loading state -->
            <div class="export-loading">
              <div>
                <div class="export-loading__spinner">⚙️</div>
                <p>
                  Generating your {selectedFormat.label}...
                </p>
              </div>
            </div>
          {:else if selectedFormat.custom && !generatedMarkdown}
            <div class="export-workspace">
              {#if error}
                <div class="export-error">
                  <p>{error}</p>
                </div>
              {/if}
              <label class="markdown-editor">
                <span>Custom transform prompt</span>
                <textarea
                  bind:value={customPrompt}
                  rows="8"
                  placeholder="Turn this project into..."
                ></textarea>
              </label>
              <button
                type="button"
                on:click={() => generateExport(selectedFormat)}
                class="btn btn-primary w-full"
                disabled={!customPrompt.trim()}
              >
                Generate Custom Export
              </button>
            </div>
          {:else if error}
            <!-- Error state -->
            <div class="export-error">
              <p>{error}</p>
            </div>
          {:else if generatedMarkdown}
            <!-- Success state -->
            <div class="export-workspace">
              <!-- Action buttons -->
              <div class="export-actions">
                <button
                  type="button"
                  on:click={saveDraft}
                  class="btn btn-primary flex-1"
                  disabled={!project}
                >
                  {activeDraftId ? "💾 Update Draft" : "💾 Save Draft"}
                </button>
                <button
                  type="button"
                  on:click={copyToClipboard}
                  class="btn btn-primary flex-1"
                >
                  📋 Copy Markdown
                </button>
                <button
                  type="button"
                  on:click={downloadMarkdown}
                  class="btn btn-ghost flex-1 border-2 border-gray-200"
                >
                  ⬇ Download .md
                </button>
              </div>
              {#if copyStatus}
                <p class="copy-status">{copyStatus}</p>
              {/if}

              <label class="markdown-editor">
                <span>Edit markdown before sharing</span>
                <textarea bind:value={generatedMarkdown} rows="18"></textarea>
              </label>
            </div>
          {/if}
        </div>
      {/if}

      {#if !selectedFormat && savedDrafts.length}
        <div class="saved-drafts">
          <div class="saved-drafts__header">
            <h3>Saved Drafts</h3>
            <span>{savedDrafts.length}/20</span>
          </div>
          <div class="saved-drafts__list">
            {#each savedDrafts as draft}
              <article class="saved-draft">
                <button
                  type="button"
                  class="saved-draft__load"
                  on:click={() => loadDraft(draft)}
                >
                  <span class="saved-draft__title">{draft.label}</span>
                  <span class="saved-draft__meta">
                    {formatDraftDate(draft.updatedAt)}
                  </span>
                  <span class="saved-draft__preview">
                    {draftPreview(draft.content)}
                  </span>
                </button>
                <button
                  type="button"
                  class="saved-draft__delete"
                  on:click={() => deleteDraft(draft.id)}
                  aria-label="Delete saved draft"
                >
                  ×
                </button>
              </article>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .export-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(30, 23, 20, 0.52);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }

  .export-drawer {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 50;
    width: min(100%, 520px);
    height: 100%;
    overflow-y: auto;
    border-left: var(--pm-border-medium) solid rgba(30, 23, 20, 0.14);
    background: linear-gradient(180deg, var(--pm-cream-light) 0%, white 100%);
    box-shadow: -18px 0 44px rgba(30, 23, 20, 0.18);
  }

  .export-drawer__header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: var(--pm-border-medium) solid rgba(30, 23, 20, 0.1);
    background: var(--pm-cream-light);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 1rem 1.25rem;
  }

  .export-drawer__header h2 {
    margin: 0;
    color: var(--pm-black);
    font-size: clamp(1.4rem, 3vw, 1.7rem);
    font-weight: 800;
    letter-spacing: 0;
  }

  .export-drawer__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.14);
    border-radius: var(--pm-radius-sm);
    background: white;
    color: var(--pm-black);
    font-size: 1.25rem;
    cursor: pointer;
    transition:
      background 0.16s ease,
      transform 0.16s ease;
  }

  .export-drawer__close:hover,
  .export-drawer__close:focus-visible {
    background: rgba(255, 214, 224, 0.42);
    outline: none;
    transform: translateY(-1px);
  }

  .export-drawer__content {
    display: grid;
    gap: 1.25rem;
    padding: 1.15rem 1.25rem 1.5rem;
  }

  .export-drawer__hint {
    margin: 0 0 0.25rem;
    color: rgba(30, 23, 20, 0.62);
    font-size: var(--pm-text-sm);
    font-weight: 700;
  }

  .format-list,
  .export-workspace {
    display: grid;
    gap: 0.75rem;
  }

  .format-option {
    display: block;
    width: 100%;
    min-height: 72px;
    border: var(--pm-border-medium) solid rgba(30, 23, 20, 0.1);
    border-radius: var(--pm-radius-sm);
    background: rgba(255, 255, 255, 0.78);
    padding: 0.85rem 0.95rem;
    text-align: left;
    cursor: pointer;
    transition:
      background 0.16s ease,
      border-color 0.16s ease,
      transform 0.16s ease;
  }

  .format-option__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
  }

  .format-option__label {
    color: var(--pm-black);
    font-size: var(--pm-text-base);
    font-weight: 800;
    line-height: 1.25;
  }

  .format-option__desc {
    margin-top: 0.25rem;
    color: rgba(30, 23, 20, 0.62);
    font-size: var(--pm-text-sm);
    line-height: 1.35;
  }

  .format-option__arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex: 0 0 auto;
    border-radius: var(--pm-radius-full);
    background: rgba(255, 214, 224, 0.36);
    color: rgba(30, 23, 20, 0.56);
    font-size: 1.35rem;
    transition:
      background 0.16s ease,
      color 0.16s ease;
  }

  .drawer-back {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: rgba(30, 23, 20, 0.66);
    font-size: var(--pm-text-sm);
    font-weight: 800;
    cursor: pointer;
  }

  .export-loading {
    display: grid;
    min-height: 220px;
    place-items: center;
    color: rgba(30, 23, 20, 0.64);
    text-align: center;
  }

  .export-loading__spinner {
    display: inline-block;
    margin-bottom: 0.75rem;
    font-size: 2.25rem;
    animation: export-spin 1.1s linear infinite;
  }

  .export-loading p,
  .export-error p,
  .copy-status {
    margin: 0;
  }

  .export-error {
    border: var(--pm-border-medium) solid rgba(232, 131, 156, 0.34);
    border-radius: var(--pm-radius-sm);
    background: rgba(255, 214, 224, 0.38);
    padding: 0.85rem;
    color: rgba(122, 40, 62, 0.94);
    font-weight: 700;
  }

  .copy-status {
    color: #15803d;
    font-size: var(--pm-text-sm);
    font-weight: 700;
  }

  @media (hover: hover) {
    .format-option:hover,
    .format-option:focus-visible {
      border-color: rgba(232, 131, 156, 0.52);
      background: rgba(255, 214, 224, 0.28);
      outline: none;
      transform: translateY(-1px);
    }

    .format-option:hover .format-option__arrow,
    .format-option:focus-visible .format-option__arrow {
      background: rgba(255, 214, 224, 0.68);
      color: var(--pm-black);
    }
  }

  @keyframes export-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .export-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .export-actions :global(.btn) {
    min-width: min(100%, 9rem);
  }

  .saved-drafts {
    display: grid;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 2px solid rgba(30, 23, 20, 0.08);
  }

  .saved-drafts__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .saved-drafts__header h3 {
    margin: 0;
    font-size: var(--pm-text-lg);
    font-weight: 800;
    color: var(--pm-black);
  }

  .saved-drafts__header span {
    color: rgba(30, 23, 20, 0.56);
    font-size: var(--pm-text-xs);
    font-weight: 700;
  }

  .saved-drafts__list {
    display: grid;
    gap: 0.6rem;
  }

  .saved-draft {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 44px;
    border: 2px solid rgba(30, 23, 20, 0.1);
    border-radius: var(--pm-radius-sm);
    background: rgba(255, 255, 255, 0.72);
    overflow: hidden;
  }

  .saved-draft__load,
  .saved-draft__delete {
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .saved-draft__load {
    display: grid;
    gap: 0.25rem;
    min-height: 72px;
    padding: 0.75rem;
    text-align: left;
  }

  .saved-draft__load:hover,
  .saved-draft__load:focus-visible {
    background: rgba(255, 214, 224, 0.28);
    outline: none;
  }

  .saved-draft__title {
    font-weight: 800;
    color: var(--pm-black);
  }

  .saved-draft__meta,
  .saved-draft__preview {
    color: rgba(30, 23, 20, 0.62);
    font-size: var(--pm-text-xs);
    line-height: 1.35;
  }

  .saved-draft__preview {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .saved-draft__delete {
    min-height: 44px;
    min-width: 44px;
    border-left: 2px solid rgba(30, 23, 20, 0.08);
    color: rgba(30, 23, 20, 0.54);
    font-size: 1.5rem;
    line-height: 1;
  }

  .saved-draft__delete:hover,
  .saved-draft__delete:focus-visible {
    background: rgba(239, 68, 68, 0.1);
    color: #b91c1c;
    outline: none;
  }

  .markdown-editor {
    display: grid;
    gap: 0.5rem;
  }

  .markdown-editor span {
    font-size: var(--pm-text-xs);
    font-weight: 700;
    color: rgba(30, 23, 20, 0.72);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .markdown-editor textarea {
    width: 100%;
    min-height: 460px;
    resize: vertical;
    border: 2px solid rgba(30, 23, 20, 0.16);
    border-radius: var(--pm-radius-sm);
    background: var(--pm-cream-light);
    padding: 1rem;
    font-family: var(--pm-font-mono);
    font-size: var(--pm-text-sm);
    line-height: 1.6;
    color: var(--pm-black);
  }

  .markdown-editor textarea:focus {
    outline: 3px solid rgba(168, 216, 234, 0.45);
    border-color: var(--pm-mint);
  }

  @media (max-width: 640px) {
    .export-drawer {
      width: 100%;
      border-left: 0;
    }

    .export-drawer__header {
      padding: 0.85rem 1rem;
    }

    .export-drawer__content {
      gap: 1rem;
      padding: 0.9rem 0.9rem 1.25rem;
    }

    .format-option {
      min-height: 68px;
      padding: 0.75rem 0.8rem;
    }

    .format-option__desc {
      font-size: var(--pm-text-xs);
    }

    .markdown-editor textarea {
      min-height: 360px;
    }
  }
</style>
