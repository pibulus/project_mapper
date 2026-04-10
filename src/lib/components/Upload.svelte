<script lang="ts">
  /**
   * Upload Component - Unified Interface
   *
   * Handles: text input, file upload (drag/drop), and audio recording
   * Warm pastel punk aesthetic with juicy interactions
   */
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import {
    currentProject,
    updateProject,
    startNewProject,
  } from "$lib/stores/projectStore";
  import { appendAudioToProject as appendProjectAudio } from "$lib/core/orchestration/append-audio";
  import { get } from "svelte/store";
  import AudioVisualizer from "./AudioVisualizer.svelte";
  import LoadingModal from "./LoadingModal.svelte";

  // ===================================================================
  // STATE MANAGEMENT
  // ===================================================================

  let mode: "audio" | "text" = "audio";
  let textInput = "";
  let audioFile: File | null = null;
  let isProcessing = false;
  let error = "";

  // Recording state
  let isRecording = false;
  let recordingTime = 0;
  let showTimeWarning = false;
  let isDragActive = false;

  // Recording refs
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let stream: MediaStream | null = null;
  let recordingTimer: number | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;

  // DOM refs
  let fileInput: HTMLInputElement;
  let textArea: HTMLTextAreaElement;

  // Constants
  const MAX_RECORDING_TIME = 10 * 60; // 10 minutes in seconds
  const WARNING_TIME = 30; // 30 seconds before limit

  // ===================================================================
  // COMPUTED VALUES
  // ===================================================================

  $: timeRemaining = MAX_RECORDING_TIME - recordingTime;
  $: hasText = textInput.trim().length > 0;
  $: primaryLabel = isRecording
    ? "Stop Recording"
    : hasText
      ? "Analyze Text"
      : audioFile
        ? "Map Audio"
        : "Start Recording";
  $: primaryDisabled = isProcessing && !isRecording;

  // ===================================================================
  // TIME FORMATTING
  // ===================================================================

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  // ===================================================================
  // RECORDING FUNCTIONS
  // ===================================================================

  async function startRecording() {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Find supported mime type
      const mimeTypes = ["audio/webm", "audio/ogg", "audio/mp4", ""];
      let mediaRecorderOptions: MediaRecorderOptions | undefined;

      for (const mimeType of mimeTypes) {
        if (!mimeType || MediaRecorder.isTypeSupported(mimeType)) {
          mediaRecorderOptions = mimeType ? { mimeType } : undefined;
          break;
        }
      }

      const recorder = new MediaRecorder(userStream, mediaRecorderOptions);
      audioChunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      // Setup Web Audio API for visualization
      try {
        const AudioContextClass =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioContextClass();
        const source = audioContext.createMediaStreamSource(userStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
      } catch (err) {
        console.warn("Failed to initialize Web Audio API:", err);
      }

      recorder.start(1000); // Collect data every second
      mediaRecorder = recorder;
      stream = userStream;
      isRecording = true;
      recordingTime = 0;
      showTimeWarning = false;

      // Start timer
      recordingTimer = setInterval(() => {
        recordingTime++;

        if (timeRemaining <= WARNING_TIME && !showTimeWarning) {
          showTimeWarning = true;
        }

        if (recordingTime >= MAX_RECORDING_TIME) {
          stopRecording();
        }
      }, 1000) as unknown as number;
    } catch (err) {
      console.error("Error starting recording:", err);
      alert(
        "Could not access microphone. Please grant permission and try again.",
      );
      cleanup();
    }
  }

  async function stopRecording() {
    if (!mediaRecorder) return;

    return new Promise<void>((resolve) => {
      const recorder = mediaRecorder!;

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, {
          type: recorder.mimeType || "audio/webm",
        });
        await processRecordedAudio(audioBlob);
        resolve();
      };

      recorder.stop();
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;

      if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
      }

      cleanup();
    });
  }

  function cleanup() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close();
      audioContext = null;
    }
    analyser = null;
    isRecording = false;
  }

  // ===================================================================
  // PROCESSING FUNCTIONS
  // ===================================================================

  async function processRecordedAudio(audioBlob: Blob) {
    console.log("🎤 Starting audio processing...", {
      size: audioBlob.size,
      type: audioBlob.type,
    });
    isProcessing = true;
    error = "";

    try {
      const project = get(currentProject);
      if (project) {
        const file = new File([audioBlob], "recording.webm", {
          type: audioBlob.type || "audio/webm",
        });
        await appendAudioToProject(file, project.id);
      } else {
        // Create the project in the DB first
        const newProject = await startNewProject({
          /* We don't have transcript yet */
        });
        if (!newProject) {
          throw new Error("Failed to create project in database");
        }

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append("conversationId", newProject.id);

        const response = await fetch("/api/process-stream", {
          method: "POST",
          body: formData,
        });

        if (response.status !== 202) {
          const data = await response.json();
          throw new Error(data.error || "Failed to start audio processing");
        }

        console.log(`✅ Started processing for conversation ${newProject.id}`);
      }
    } catch (err: any) {
      console.error("❌ Error processing audio:", err);
      error = err.message || "Failed to process audio";
    } finally {
      isProcessing = false;
    }
  }

  async function processAudioFile(file: File) {
    console.log("📁 Processing audio file:", file.name);
    isProcessing = true;
    error = "";

    try {
      const project = get(currentProject);
      if (project) {
        await appendAudioToProject(file, project.id);
      } else {
        // Create the project in the DB first
        const newProject = await startNewProject({
          /* We don't have the transcript yet */
        });
        if (!newProject) {
          throw new Error("Failed to create project in database");
        }

        const formData = new FormData();
        formData.append("audio", file);
        formData.append("conversationId", newProject.id);

        const response = await fetch("/api/process-stream", {
          method: "POST",
          body: formData,
        });

        if (response.status !== 202) {
          const data = await response.json();
          throw new Error(data.error || "Failed to start file processing");
        }

        console.log(`✅ Started processing for conversation ${newProject.id}`);
      }
    } catch (err: any) {
      console.error("❌ Error processing file:", err);
      error = err.message || "Failed to process audio file";
    } finally {
      isProcessing = false;
      // Reset form
      audioFile = null;
      textInput = "";
    }
  }

  async function appendAudioToProject(file: File, projectId: string) {
    const project = get(currentProject);
    if (!project || project.id !== projectId) {
      throw new Error("No active project selected for append");
    }

    const { updates, warnings } = await appendProjectAudio(project, file);
    updateProject(updates);
    if (warnings?.length) {
      console.warn("Append analysis warnings:", warnings);
    }

    console.log(`✅ Appended audio to project ${projectId}`);
  }

  async function processText() {
    if (!textInput.trim()) {
      error = "Please enter some text";
      return;
    }

    isProcessing = true;
    error = "";

    try {
      // Create the project in the DB first
      const newProject = await startNewProject({ transcript: textInput });
      if (!newProject) {
        throw new Error("Failed to create project in database");
      }

      const response = await fetch("/api/process-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textInput,
          conversationId: newProject.id,
        }),
      });

      if (response.status !== 202) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start text processing");
      }

      console.log(`✅ Started processing for conversation ${newProject.id}`);
    } catch (err: any) {
      console.error("Error processing text:", err);
      error = err.message || "Failed to process text";
    } finally {
      isProcessing = false;
      // Reset form after processing starts
      audioFile = null;
      textInput = "";
    }
  }

  // ===================================================================
  // FILE HANDLING
  // ===================================================================

  function stageFile(file: File) {
    audioFile = file;
    textInput = "";
    isDragActive = false;
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      stageFile(file);
      target.value = ""; // Reset input
    }
  }

  function clearSelectedFile() {
    audioFile = null;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  // ===================================================================
  // DRAG AND DROP
  // ===================================================================

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (!isRecording) {
      isDragActive = true;
    }
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as Node;
    if (!target.contains(related)) {
      isDragActive = false;
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragActive = false;
    if (isRecording) return;

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      stageFile(file);
    }
  }

  // ===================================================================
  // PRIMARY ACTION
  // ===================================================================

  async function handlePrimaryAction() {
    if (isRecording) {
      await stopRecording();
      return;
    }

    if (hasText) {
      await processText();
      return;
    }

    if (audioFile) {
      await processAudioFile(audioFile);
      return;
    }

    if (!isProcessing) {
      await startRecording();
    }
  }

  // ===================================================================
  // LIFECYCLE
  // ===================================================================

  onDestroy(() => {
    cleanup();
  });
</script>

<div class="upload-container">
  <!-- Header with mode toggle -->
  <div class="upload-header">
    <div class="upload-intro">
      <p class="upload-kicker">Start mapping</p>
      <h2>Capture the raw material</h2>
      <p class="upload-description">
        Speak, paste, or drop an audio file. The layout stays put.
      </p>
    </div>
    <div class="mode-toggle">
      <button
        type="button"
        class="mode-btn {mode === 'audio' ? 'active' : ''}"
        on:click={() => (mode = "audio")}
      >
        <span aria-hidden="true">🎙️</span>
        Audio
      </button>
      <button
        type="button"
        class="mode-btn {mode === 'text' ? 'active' : ''}"
        on:click={() => (mode = "text")}
      >
        <span aria-hidden="true">📝</span>
        Text
      </button>
    </div>
  </div>

  <div class="upload-body">
    <div class="upload-hint">
      <span>Cmd/Ctrl + Enter to analyze text fast</span>
      <span>10 minute recording cap</span>
    </div>

    <!-- Unified Input Area -->
    <div
      class="unified-input"
      class:is-drop={isDragActive}
      class:has-file={audioFile}
      class:is-recording={isRecording}
      on:dragover={isRecording ? undefined : handleDragOver}
      on:dragenter={isRecording ? undefined : handleDragOver}
      on:dragleave={isRecording ? undefined : handleDragLeave}
      on:drop={isRecording ? undefined : handleDrop}
      on:click={() => !isRecording && textArea?.focus()}
      on:keydown={(event) => {
        if (!isRecording && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          textArea?.focus();
        }
      }}
      role="button"
      tabindex="0"
    >
      {#if isRecording}
        <!-- Recording Visual -->
        <div class="record-visual">
          <div class="record-visual__top">
            <div class="record-label">Recording</div>
            <div class="record-time">
              {formatTime(recordingTime)}
            </div>
          </div>

          <div class="record-bar">
            <div
              class="record-bar__fill"
              style="width: {(recordingTime / MAX_RECORDING_TIME) *
                100}%; background: {showTimeWarning
                ? '#EF4444'
                : 'var(--pm-pink)'};"
            ></div>
          </div>

          {#if showTimeWarning}
            <p class="record-warning">
              Auto-stop in {formatTime(timeRemaining)} — wrap it up.
            </p>
          {/if}

          <div class="record-visualizer">
            <AudioVisualizer {analyser} />
          </div>
        </div>
      {:else}
        <!-- Text Input State -->
        <textarea
          bind:this={textArea}
          bind:value={textInput}
          class="text-input"
          placeholder={mode === "audio"
            ? "Talk it out, paste a rant, or drop a recording here."
            : "Paste notes, meeting rambles, or half-formed thoughts here."}
          on:input={() => {
            if (audioFile) {
              audioFile = null;
            }
          }}
          on:keydown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && hasText) {
              e.preventDefault();
              processText();
            }
          }}
          on:focus={() => (isDragActive = false)}
        ></textarea>

        <!-- File Chip -->
        {#if audioFile}
          <div class="file-chip">
            <span>{audioFile.name}</span>
            <button
              type="button"
              aria-label="Remove file"
              on:click={(event) => {
                event.stopPropagation();
                clearSelectedFile();
              }}
            >
              ×
            </button>
          </div>
        {/if}

        <!-- Paperclip Button -->
        <button
          type="button"
          class="clip-btn"
          aria-label="Browse file"
          on:click={(event) => {
            event.stopPropagation();
            fileInput?.click();
          }}
        >
          📎
        </button>
      {/if}
    </div>

    <!-- Error Message -->
    {#if error}
      <div class="error-box">
        {error}
      </div>
    {/if}

    <!-- Primary Action Button -->
    <button
      class="btn btn-primary"
      style="margin-top: 1rem; width: 100%;"
      disabled={primaryDisabled}
      on:click={handlePrimaryAction}
    >
      {#if isProcessing && !isRecording}
        <span
          class="inline-block animate-spin-slow"
          style="margin-right: 0.5rem;">⚙️</span
        >
        Processing with AI...
      {:else}
        {primaryLabel}
      {/if}
    </button>
  </div>
</div>

<!-- Hidden file input -->
<input
  bind:this={fileInput}
  type="file"
  accept="audio/*"
  on:change={handleFileSelect}
  style="display: none;"
/>

<!-- Loading Modal -->
<LoadingModal isOpen={isProcessing && !isRecording} />

<style>
  /* ===================================================================
	 * CONTAINER
	 * ================================================================= */

  .upload-container {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .upload-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .upload-intro {
    display: grid;
    gap: 0.35rem;
  }

  .upload-kicker {
    margin: 0;
    font-size: var(--pm-text-xs);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(58, 42, 34, 0.58);
  }

  .upload-header h2 {
    font-size: clamp(1.3rem, 2vw, 1.7rem);
    font-weight: 700;
    margin: 0;
    color: var(--pm-black);
    letter-spacing: -0.04em;
  }

  .upload-description {
    margin: 0;
    font-size: var(--pm-text-sm);
    line-height: 1.5;
    color: rgba(58, 42, 34, 0.72);
  }

  .mode-toggle {
    display: flex;
    gap: var(--pm-space-sm);
    align-items: center;
    padding: 0.25rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(30, 23, 20, 0.08);
  }

  .upload-body {
    display: grid;
    gap: 0.9rem;
  }

  .upload-hint {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    font-size: var(--pm-text-xs);
    color: rgba(58, 42, 34, 0.6);
  }

  .upload-hint span {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .upload-hint span::before {
    content: "";
    width: 0.35rem;
    height: 0.35rem;
    border-radius: 999px;
    background: rgba(232, 131, 156, 0.65);
  }

  /* ===================================================================
	 * MODE TOGGLE BUTTONS
	 * ================================================================= */

  .mode-btn {
    min-height: 44px;
    padding: 0.625rem 0.95rem;
    border-radius: 999px;
    font-size: var(--pm-text-sm);
    font-weight: 600;
    transition: all var(--pm-transition-fast);
    cursor: pointer;
    background: var(--pm-cream-dark);
    color: var(--pm-black);
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.12);
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .mode-btn:hover {
    background: var(--pm-cream-light);
    transform: translateY(-1px);
  }

  .mode-btn.active {
    background: var(--pm-pink);
    color: var(--pm-cream);
    border-color: var(--pm-pink);
    box-shadow: 0 10px 22px rgba(232, 131, 156, 0.28);
  }

  /* ===================================================================
	 * UNIFIED INPUT
	 * ================================================================= */

  .unified-input {
    position: relative;
    border: var(--pm-border-medium) dashed rgba(30, 23, 20, 0.2);
    border-radius: var(--pm-radius-lg);
    padding: 1rem 1rem 4.5rem;
    min-height: 260px;
    height: 260px; /* Fixed height - no layout shifts! */
    display: flex;
    flex-direction: column;
    transition:
      border-color var(--pm-transition-medium),
      background var(--pm-transition-medium),
      box-shadow var(--pm-transition-medium);
    background:
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.55),
        rgba(255, 247, 239, 0.85)
      ),
      var(--pm-cream-dark);
    cursor: text;
  }

  .unified-input:hover {
    border-color: rgba(30, 23, 20, 0.3);
    background: var(--pm-cream-light);
  }

  .unified-input.is-drop {
    border-color: var(--pm-pink);
    background: rgba(232, 131, 156, 0.05);
    box-shadow: 0 0 0 4px rgba(232, 131, 156, 0.1);
  }

  .unified-input.is-recording {
    border-style: solid;
    border-color: var(--pm-pink);
    background: var(--pm-cream-light);
    cursor: default;
  }

  .unified-input.has-file {
    border-color: var(--pm-mint);
  }

  /* ===================================================================
	 * TEXT INPUT
	 * ================================================================= */

  .text-input {
    width: 100%;
    flex: 1; /* Fill available space */
    padding: 0;
    margin: 0;
    border: none;
    font-size: 0.98rem;
    line-height: 1.65;
    color: var(--pm-black);
    background: transparent;
    resize: none;
    font-family: var(--pm-font-sans);
    outline: none;
    overflow-y: auto; /* Scroll if text is too long */
  }

  .text-input::placeholder {
    color: var(--pm-brown);
    opacity: 0.46;
  }

  /* ===================================================================
	 * FILE CHIP
	 * ================================================================= */

  .file-chip {
    position: absolute;
    bottom: 1rem;
    left: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: var(--pm-mint);
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.12);
    border-radius: var(--pm-radius-sm);
    font-size: var(--pm-text-xs);
    font-weight: 600;
    color: var(--pm-black);
    box-shadow: var(--pm-shadow-soft);
    max-width: calc(100% - 5rem);
  }

  .file-chip span {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-chip button {
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(30, 23, 20, 0.08);
    color: var(--pm-black);
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    padding: 0;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--pm-transition-fast);
  }

  .file-chip button:hover {
    color: var(--pm-pink);
    transform: scale(1.06);
  }

  /* ===================================================================
	 * PAPERCLIP BUTTON
	 * ================================================================= */

  .clip-btn {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: var(--pm-radius-sm);
    background: var(--pm-cream);
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all var(--pm-transition-fast);
    box-shadow: var(--pm-shadow-soft);
  }

  .clip-btn:hover {
    background: var(--pm-pink);
    border-color: var(--pm-pink);
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(232, 131, 156, 0.26);
  }

  /* ===================================================================
	 * RECORDING VISUAL
	 * ================================================================= */

  .record-visual {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%; /* Fill the fixed container */
    justify-content: space-between;
  }

  .record-visual__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .record-label {
    font-size: var(--pm-text-sm);
    font-weight: 600;
    color: var(--pm-pink);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .record-label::before {
    content: "●";
    font-size: 1.25rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  .record-time {
    font-family: var(--pm-font-mono);
    font-size: var(--pm-text-xl);
    font-weight: 600;
    color: var(--pm-black);
  }

  .record-bar {
    width: 100%;
    height: 0.5rem;
    background: rgba(30, 23, 20, 0.1);
    border-radius: var(--pm-radius-sm);
    overflow: hidden;
  }

  .record-bar__fill {
    height: 100%;
    transition:
      width 0.3s ease,
      background 0.3s ease;
    border-radius: var(--pm-radius-sm);
  }

  .record-warning {
    font-size: var(--pm-text-xs);
    color: #b91c1c;
    font-weight: 600;
    text-align: center;
    margin: 0;
    animation: pulse 1s ease-in-out infinite;
  }

  .record-visualizer {
    flex: 1; /* Take remaining space */
    min-height: 0; /* Allow flexbox to shrink if needed */
    display: flex;
    align-items: flex-end; /* Align visualizer to bottom */
  }

  /* ===================================================================
	 * ERROR BOX
	 * ================================================================= */

  .error-box {
    padding: 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border: var(--pm-border-medium) solid rgba(239, 68, 68, 0.3);
    border-radius: var(--pm-radius-sm);
    font-size: var(--pm-text-sm);
    color: #b91c1c;
  }

  @media (max-width: 768px) {
    .upload-header {
      flex-direction: column;
    }

    .mode-toggle {
      width: 100%;
    }

    .mode-btn {
      flex: 1;
      justify-content: center;
    }
  }

  @media (max-width: 640px) {
    .upload-container {
      gap: 1rem;
    }

    .unified-input {
      min-height: 220px;
      height: 220px;
      padding: 0.9rem 0.9rem 4rem;
    }

    .text-input {
      font-size: 0.95rem;
    }

    .file-chip {
      max-width: calc(100% - 4.6rem);
    }
  }
</style>
