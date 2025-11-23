<script lang="ts">
	/**
	 * AudioVisualizer - Real-time frequency visualization
	 * Warm pastel punk aesthetic with rounded bars
	 */
	import { onMount, onDestroy } from 'svelte';

	export let analyser: AnalyserNode | null = null;

	let canvas: HTMLCanvasElement;
	let animationFrameId: number | null = null;
	let dataArray: Uint8Array | null = null;

	// Warm pastel punk colors
	const accentColor = 'rgba(232, 131, 156, 0.9)'; // Pink
	const accentLight = 'rgba(255, 209, 163, 0.7)'; // Peach

	onMount(() => {
		if (!analyser || !canvas) {
			console.warn('AudioVisualizer: No analyser or canvas available');
			return;
		}

		console.log('🎵 Initializing audio visualizer');
		const canvasCtx = canvas.getContext('2d');
		if (!canvasCtx) {
			console.error('Failed to get canvas context');
			return;
		}

		// Initialize data array for frequency data
		dataArray = new Uint8Array(analyser.frequencyBinCount);
		console.log(`🎵 Visualizer ready (${analyser.frequencyBinCount} frequency bins)`);

		// Animation draw function - ELEGANT ROUNDED BARS
		function draw() {
			if (!analyser || !canvasCtx || !canvas || !dataArray) return;

			const WIDTH = canvas.width;
			const HEIGHT = canvas.height;

			animationFrameId = requestAnimationFrame(draw);

			// Get frequency data from analyser
			analyser.getByteFrequencyData(dataArray);

			// Clear with subtle warm background
			canvasCtx.fillStyle = 'rgba(254, 252, 247, 0.15)'; // Soft cream
			canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

			// Sample fewer bars for cleaner look
			const barCount = 48;
			const barWidth = Math.floor(WIDTH / barCount) - 4;
			const sampleStep = Math.floor(dataArray.length / barCount);

			for (let i = 0; i < barCount; i++) {
				const dataIndex = i * sampleStep;
				const value = dataArray[dataIndex];
				const barHeight = (value / 255) * HEIGHT * 0.85; // 85% max height

				const x = i * (barWidth + 4) + 2;
				const y = HEIGHT - barHeight;

				// Warm gradient from pink to peach
				const gradient = canvasCtx.createLinearGradient(x, y, x, HEIGHT);
				gradient.addColorStop(0, accentColor);
				gradient.addColorStop(0.6, accentColor);
				gradient.addColorStop(1, accentLight);

				canvasCtx.fillStyle = gradient;

				// Rounded bars
				canvasCtx.beginPath();
				const radius = Math.min(barWidth / 2, 3);
				canvasCtx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
				canvasCtx.fill();
			}
		}

		// Start animation
		draw();
	});

	onDestroy(() => {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		console.log('🎵 Audio visualizer cleaned up');
	});
</script>

<div class="visualizer-container">
	<canvas bind:this={canvas} width="1024" height="120" class="visualizer-canvas" />
</div>

<style>
	.visualizer-container {
		width: 100%;
		flex: 1; /* Fill available space from parent */
		min-height: 0; /* Allow flexbox to shrink */
		background: rgba(30, 23, 20, 0.03);
		border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.1);
		border-radius: var(--pm-radius-md);
		padding: 0.75rem;
		box-shadow: inset 0 1px 3px rgba(30, 23, 20, 0.06);
		display: flex;
		align-items: center;
	}

	.visualizer-canvas {
		display: block;
		width: 100%;
		height: 56px; /* Slightly smaller to fit better */
		border-radius: var(--pm-radius-sm);
	}
</style>
