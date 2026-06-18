<script lang="ts">
  import { onDestroy } from "svelte";

  // Accept the AnalyserNode from the parent recording stream
  export let analyser: AnalyserNode | null = null;

  let audioDataArray: Float32Array;
  let animationFrameId: number;
  let audioLevel = 0;
  let history: number[] = []; // Array to store audio level history
  const historyLength = 48; // Number of visualizer bars
  let recording = false;

  // Platform-specific calibration for visual mapping
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isAndroid = /Android/i.test(userAgent);
  const isiPhone = /iPhone|iPad/i.test(userAgent);
  const isMac = /Macintosh/i.test(userAgent);

  let scalingFactor: number;
  let offset: number;
  let exponent: number;

  if (isAndroid) {
    scalingFactor = 40;
    offset = 80;
    exponent = 0.5;
  } else if (isiPhone) {
    scalingFactor = 40;
    offset = 80;
    exponent = 0.2;
  } else if (isMac) {
    scalingFactor = 20;
    offset = 100;
    exponent = 0.5;
  } else {
    // PC default
    scalingFactor = 2000;
    offset = 80;
    exponent = 0.5;
  }

  // Reactive listener to bind visualizer lifecycle to parent stream analyser
  $: if (analyser) {
    recording = true;
    startVisualizer();
  } else {
    stopVisualizer();
  }

  let frameSkipCounter = 0;
  const frameSkipRate = 2; // Decelerate visual frames for smooth styling

  function updateVisualizer() {
    if (!recording || !analyser) return;

    if (frameSkipCounter < frameSkipRate) {
      frameSkipCounter++;
      animationFrameId = requestAnimationFrame(updateVisualizer);
      return;
    }
    frameSkipCounter = 0;

    const bufferLength = analyser.frequencyBinCount;
    audioDataArray = new Float32Array(bufferLength);
    analyser.getFloatFrequencyData(audioDataArray as any);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += audioDataArray[i];
    }

    // Map decibel level to a 0-100 scale using exponential curve
    let linearLevel = Math.max(0, sum / bufferLength + offset);
    let nonLinearLevel = Math.pow(linearLevel, exponent);
    audioLevel = Math.max(
      0,
      Math.min(
        100,
        nonLinearLevel * (100 / Math.pow(scalingFactor, exponent)),
      ),
    );

    history = [audioLevel, ...history];
    if (history.length > historyLength) {
      history.pop();
    }

    animationFrameId = requestAnimationFrame(updateVisualizer);
  }

  function startVisualizer() {
    history = Array(historyLength).fill(0);
    updateVisualizer();
  }

  function stopVisualizer() {
    recording = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    audioLevel = 0;
    history = Array(historyLength).fill(0);
  }

  onDestroy(() => {
    stopVisualizer();
  });
</script>

<div class="visualizer-container">
  {#each history as level, index (index)}
    <div
      class="history-bar"
      style="height: {level}%; width: {100 / historyLength}%; left: {index * (100 / historyLength)}%"
    ></div>
  {/each}
</div>

<style>
  .visualizer-container {
    position: relative;
    width: 100%;
    height: 56px;
    display: flex;
    flex-direction: row-reverse;
    border-radius: var(--pm-radius-md);
    overflow: hidden;
    background: rgba(254, 240, 230, 0.55);
    border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.06);
    box-shadow: inset 0 0 12px rgba(255, 200, 180, 0.08);
    contain: content;
  }

  .history-bar {
    position: absolute;
    bottom: 0;
    background: linear-gradient(
      to top,
      var(--pm-pink),
      #ff9f9a,
      var(--pm-cream)
    );
    transition: height 0.15s ease-in-out;
    border-radius: 3px 3px 0 0;
    margin-right: 1px;
    box-shadow: 0 0 4px rgba(255, 180, 200, 0.15);
    opacity: 0.9;
    will-change: transform;
    transform: translateZ(0);
    backface-visibility: hidden;
  }
</style>
