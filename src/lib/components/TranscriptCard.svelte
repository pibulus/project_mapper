<script lang="ts">
  /**
   * TranscriptCard Component
   *
   * Displays the conversation transcript. Gets data from the projectStore.
   */
  import { onDestroy } from "svelte";
  import { currentProject } from "$lib/stores/projectStore";
  import Card from "./ui/Card.svelte";
  import { topicSelection } from "$lib/stores/topicSelection";
  import { textMatchesTopic } from "$lib/utils/topicUtils";

  const { hoveredTopic, selectedTopic } = topicSelection;

  $: transcript = $currentProject?.transcript || "";
  $: lines = transcript.split("\n").filter((line) => line.trim());
  $: activeTopic = $hoveredTopic || $selectedTopic;

  let lineRefs: HTMLParagraphElement[] = [];
  let pulsingIndex = -1;
  let pulseTimeout: ReturnType<typeof setTimeout> | null = null;
  let copyStatus = "";
  let copyStatusTimeout: ReturnType<typeof setTimeout> | null = null;

  function lineMatchesTopic(line: string): boolean {
    return textMatchesTopic(line, activeTopic);
  }

  function scrollToLine(index: number) {
    const el = lineRefs[index];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    pulsingIndex = index;
    if (pulseTimeout) {
      clearTimeout(pulseTimeout);
    }
    pulseTimeout = setTimeout(() => {
      pulsingIndex = -1;
    }, 900);
  }

  function setCopyStatus(message: string) {
    copyStatus = message;
    if (copyStatusTimeout) {
      clearTimeout(copyStatusTimeout);
    }
    copyStatusTimeout = setTimeout(() => {
      copyStatus = "";
    }, 1800);
  }

  async function copyTranscript() {
    if (!transcript.trim()) return;

    try {
      await navigator.clipboard.writeText(transcript);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  onDestroy(() => {
    if (copyStatusTimeout) {
      clearTimeout(copyStatusTimeout);
    }
    if (pulseTimeout) {
      clearTimeout(pulseTimeout);
    }
  });

  $: if (activeTopic) {
    const targetIndex = lines.findIndex((line) => lineMatchesTopic(line));
    if (targetIndex >= 0) {
      scrollToLine(targetIndex);
    }
  }
</script>

<Card title="📝 Transcript">
  <svelte:fragment slot="actions">
    {#if transcript.trim()}
      <div class="transcript-actions">
        <span class="copy-status" aria-live="polite">{copyStatus}</span>
        <button
          type="button"
          class="copy-transcript-btn"
          on:click={copyTranscript}
          title="Copy transcript text"
        >
          Copy transcript
        </button>
      </div>
    {/if}
  </svelte:fragment>

  <div class="transcript-scroll">
    {#if lines.length === 0}
      <p class="empty-state">No transcript yet</p>
    {:else}
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        {#each lines as line, index}
          <p
            bind:this={lineRefs[index]}
            class:line-highlight={lineMatchesTopic(line)}
            class:line-pulse={pulsingIndex === index}
            style="
							font-size: var(--pm-text-sm);
							line-height: 1.6;
							color: var(--pm-black);
							margin: 0;
							padding: 0.15rem 0.25rem;
							border-radius: var(--pm-radius-sm);
						"
          >
            {line}
          </p>
        {/each}
      </div>
    {/if}
  </div>
</Card>

<style>
  .transcript-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .copy-status {
    color: rgba(30, 23, 20, 0.62);
    font-size: var(--pm-text-xs);
    font-weight: 700;
  }

  .copy-transcript-btn {
    min-height: 44px;
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.2);
    border-radius: var(--pm-radius-sm);
    background: white;
    padding: 0.45rem 0.75rem;
    color: var(--pm-brown);
    font-size: var(--pm-text-xs);
    font-weight: 800;
    cursor: pointer;
    box-shadow: 2px 2px 0 rgba(30, 23, 20, 0.08);
  }

  .copy-transcript-btn:hover,
  .copy-transcript-btn:focus-visible {
    border-color: var(--pm-pink);
    color: var(--pm-pink);
    outline: none;
  }

  .transcript-scroll {
    max-height: 400px;
    overflow-y: auto;
  }

  .line-highlight {
    background: rgba(255, 105, 180, 0.15);
    box-shadow: inset 0 0 0 1px rgba(255, 105, 180, 0.4);
  }

  @media (max-width: 640px) {
    .transcript-scroll {
      max-height: none;
    }
  }

  .line-pulse {
    animation: pulse 0.9s ease-out;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(255, 105, 180, 0.45);
    }
    100% {
      box-shadow: 0 0 0 24px rgba(255, 105, 180, 0);
    }
  }
</style>
