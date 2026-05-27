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
      generatedMarkdown = result.markdown;
    } catch (err: any) {
      console.error("Error generating export:", err);
      error = err.message || "Failed to generate export";
    } finally {
      isGenerating = false;
    }
  }

  function copyToClipboard() {
    if (!generatedMarkdown) return;

    navigator.clipboard.writeText(generatedMarkdown).then(
      () => {
        copyStatus = "Copied to clipboard";
      },
      (err) => {
        console.error("Failed to copy:", err);
        error = "Failed to copy to clipboard";
      },
    );
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
    class="fixed inset-0 bg-black/50 z-40"
    on:click={handleClose}
    on:keydown={handleBackdropKeydown}
    transition:fade={{ duration: 200 }}
    role="button"
    tabindex="0"
    aria-label="Close drawer"
  ></div>

  <!-- Drawer -->
  <div
    class="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white shadow-2xl z-50 overflow-y-auto"
    transition:fly={{ x: 500, duration: 300, easing: cubicOut }}
  >
    <!-- Header -->
    <div
      class="sticky top-0 bg-white border-b-2 border-gray-200 px-6 py-4 flex items-center justify-between z-10"
    >
      <h2 class="text-2xl font-bold">Export Project</h2>
      <button
        on:click={handleClose}
        class="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center text-2xl transition-colors"
        aria-label="Close"
      >
        ✕
      </button>
    </div>

    <!-- Content -->
    <div class="p-6 space-y-6">
      {#if !selectedFormat}
        <!-- Format Selection -->
        <div class="space-y-3">
          <p class="text-gray-600 mb-4">Choose an export format:</p>
          {#each formats as format}
            <button
              on:click={() => selectFormat(format)}
              class="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-all group"
            >
              <div class="flex items-center justify-between">
                <div>
                  <div
                    class="font-semibold text-lg group-hover:text-pink-600 transition-colors"
                  >
                    {format.label}
                  </div>
                  <div class="text-sm text-gray-600 mt-1">{format.desc}</div>
                </div>
                <div
                  class="text-2xl opacity-50 group-hover:opacity-100 transition-opacity"
                >
                  →
                </div>
              </div>
            </button>
          {/each}
        </div>
      {:else}
        <!-- Generated Output -->
        <div class="space-y-4">
          <!-- Back button -->
          <button
            on:click={() => {
              selectedFormat = null;
              generatedMarkdown = "";
              error = "";
              copyStatus = "";
              activeDraftId = "";
            }}
            class="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            ← Back to formats
          </button>

          {#if isGenerating}
            <!-- Loading state -->
            <div class="flex items-center justify-center py-12">
              <div class="text-center">
                <div class="inline-block animate-spin text-4xl mb-4">⚙️</div>
                <p class="text-gray-600">
                  Generating your {selectedFormat.label}...
                </p>
              </div>
            </div>
          {:else if selectedFormat.custom && !generatedMarkdown}
            <div class="space-y-4">
              {#if error}
                <div class="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <p class="text-red-700">{error}</p>
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
                on:click={() => generateExport(selectedFormat)}
                class="w-full btn btn-primary"
                disabled={!customPrompt.trim()}
              >
                Generate Custom Export
              </button>
            </div>
          {:else if error}
            <!-- Error state -->
            <div class="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p class="text-red-700">{error}</p>
            </div>
          {:else if generatedMarkdown}
            <!-- Success state -->
            <div class="space-y-4">
              <!-- Action buttons -->
              <div class="export-actions">
                <button
                  on:click={saveDraft}
                  class="flex-1 btn btn-primary"
                  disabled={!project}
                >
                  {activeDraftId ? "💾 Update Draft" : "💾 Save Draft"}
                </button>
                <button
                  on:click={copyToClipboard}
                  class="flex-1 btn btn-primary"
                >
                  📋 Copy Markdown
                </button>
                <button
                  on:click={downloadMarkdown}
                  class="flex-1 btn btn-ghost border-2 border-gray-200"
                >
                  ⬇ Download .md
                </button>
              </div>
              {#if copyStatus}
                <p class="text-sm text-green-700">{copyStatus}</p>
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
</style>
