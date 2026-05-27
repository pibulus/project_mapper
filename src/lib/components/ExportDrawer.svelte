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
  import type { ConversationData } from "$lib/core/types";

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
  let isGenerating = false;
  let error = "";
  let copyStatus = "";
  $: exportTranscript = project?.transcript || transcript;

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
              <div class="flex gap-2">
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
    </div>
  </div>
{/if}

<style>
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
