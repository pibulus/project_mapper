<script lang="ts">
  /**
   * TranscriptCard Component
   *
   * Displays the conversation transcript. Gets data from the projectStore.
   */
  import { onDestroy } from "svelte";
  import { currentProject, updateProject } from "$lib/stores/projectStore";
  import Card from "./ui/Card.svelte";
  import { topicSelection } from "$lib/stores/topicSelection";
  import { textMatchesTopic } from "$lib/utils/topicUtils";
  import { fade } from "svelte/transition";

  const { hoveredTopic, selectedTopic } = topicSelection;

  $: transcript = $currentProject?.transcript || "";
  $: lines = transcript.split("\n").filter((line) => line.trim());
  $: activeTopic = $hoveredTopic || $selectedTopic;

  let showSpeakerEditor = false;
  let speakerRenames: Record<string, string> = {};

  $: uniqueSpeakers = Array.from(
    new Set(
      lines
        .map((line) => {
          const match = line.match(/^([^:]+):/);
          return match ? match[1].trim() : null;
        })
        .filter((s): s is string => !!s && s.toLowerCase() !== "http" && s.toLowerCase() !== "https")
    )
  );

  function initSpeakerEditor() {
    speakerRenames = {};
    uniqueSpeakers.forEach((speaker) => {
      speakerRenames[speaker] = speaker;
    });
    showSpeakerEditor = !showSpeakerEditor;
  }

  function applySpeakerRenames() {
    let currentText = transcript;
    let changed = false;
    for (const oldName of uniqueSpeakers) {
      const newName = speakerRenames[oldName]?.trim();
      if (newName && newName !== oldName) {
        const escapedName = oldName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`^${escapedName}:`, "gm");
        currentText = currentText.replace(regex, `${newName}:`);
        changed = true;
      }
    }
    if (changed) {
      updateProject({ transcript: currentText });
      showSpeakerEditor = false;
      speakerRenames = {};
    }
  }

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
        {#if uniqueSpeakers.length > 0}
          <button
            type="button"
            class="copy-transcript-btn"
            on:click={initSpeakerEditor}
            title="Rename detected speaker names"
          >
            {showSpeakerEditor ? "Cancel" : "Rename Speakers"}
          </button>
        {/if}
        <button
          type="button"
          class="copy-transcript-btn"
          on:click={copyTranscript}
          title="Copy transcript text"
        >
          Copy
        </button>
      </div>
    {/if}
  </svelte:fragment>

  <div class="transcript-scroll">
    {#if lines.length === 0}
      <p class="empty-state">No transcript yet</p>
    {:else if showSpeakerEditor}
      <div class="speaker-editor-panel" transition:fade={{ duration: 150 }}>
        <h4>Rename Speakers</h4>
        <p class="editor-desc">Updates all matching lines across this project.</p>
        <div class="speaker-list">
          {#each uniqueSpeakers as speaker}
            <div class="speaker-row">
              <span class="speaker-badge" title={speaker}>🎙️ {speaker.slice(0, 14)}{speaker.length > 14 ? '..' : ''}</span>
              <span class="arrow-indicator">→</span>
              <input
                type="text"
                class="speaker-input"
                bind:value={speakerRenames[speaker]}
                placeholder="Type name..."
                maxlength="40"
              />
            </div>
          {/each}
        </div>
        <div class="editor-actions">
          <button type="button" class="btn-cancel" on:click={() => (showSpeakerEditor = false)}>
            Cancel
          </button>
          <button type="button" class="btn-apply" on:click={applySpeakerRenames}>
            Apply
          </button>
        </div>
      </div>
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

  /* Speaker Editor Styling */
  .speaker-editor-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.25rem;
  }

  .speaker-editor-panel h4 {
    margin: 0;
    font-size: var(--pm-text-md);
    font-weight: 800;
    color: var(--pm-black);
  }

  .editor-desc {
    margin: -0.6rem 0 0.4rem;
    font-size: var(--pm-text-xs);
    color: var(--pm-brown);
    opacity: 0.7;
  }

  .speaker-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .speaker-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .speaker-badge {
    min-width: 120px;
    font-size: var(--pm-text-sm);
    font-weight: 700;
    color: var(--pm-black);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .arrow-indicator {
    color: rgba(30, 23, 20, 0.4);
  }

  .speaker-input {
    flex: 1;
    min-height: 38px;
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.25);
    border-radius: var(--pm-radius-sm);
    padding: 0.35rem 0.65rem;
    font-size: var(--pm-text-sm);
    background: white;
  }

  .editor-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }

  .btn-cancel {
    min-height: 38px;
    padding: 0.45rem 0.85rem;
    border-radius: var(--pm-radius-sm);
    background: transparent;
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.2);
    color: var(--pm-brown);
    font-size: var(--pm-text-xs);
    font-weight: 700;
    cursor: pointer;
  }

  .btn-cancel:hover {
    background: rgba(30, 23, 20, 0.05);
  }

  .btn-apply {
    min-height: 38px;
    padding: 0.45rem 0.85rem;
    border-radius: var(--pm-radius-sm);
    background: var(--pm-black);
    border: var(--pm-border-thin) solid var(--pm-black);
    color: white;
    font-size: var(--pm-text-xs);
    font-weight: 700;
    cursor: pointer;
  }

  .btn-apply:hover {
    background: var(--pm-brown);
  }
</style>
