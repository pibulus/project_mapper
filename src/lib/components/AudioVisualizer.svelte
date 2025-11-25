<script>
	import { onMount, onDestroy } from 'svelte';

	// Audio visualization configuration
	let audioDataArray;
	let animationFrameId;
	let audioLevel = 0;
	let history = []; // Array to store audio level history
	const historyLength = 48; // More bars for project_mapper (talktype uses 30)
	let analyser;
	let audioContext;
	let recording = false;

	// Safari/iOS detection
	const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
	const isAndroid = /Android/i.test(userAgent);
	const isiPhone = /iPhone|iPad/i.test(userAgent);
	const isMac = /Macintosh/i.test(userAgent);
	const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);

	// Use fallback visualizer for Safari or iOS
	const useFallbackVisualizer = isiPhone || isSafari;

	// Platform-specific calibration
	let scalingFactor;
	let offset;
	let exponent;

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

	// ===== STANDARD AUDIO VISUALIZER =====
	async function initStandardVisualizer() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			// Handle Safari audio context suspension
			if (typeof window !== 'undefined' && window.document) {
				window.document.addEventListener(
					'click',
					() => {
						if (audioContext && audioContext.state === 'suspended') {
							audioContext.resume();
						}
					},
					{ once: true }
				);
			}

			audioContext = new (window.AudioContext || window.webkitAudioContext)();
			analyser = audioContext.createAnalyser();
			const source = audioContext.createMediaStreamSource(stream);
			source.connect(analyser);
			analyser.fftSize = 256;

			recording = true;
			startVisualizer();
		} catch (error) {
			console.error('Error accessing microphone:', error);
			recording = false;
			initFallbackVisualizer();
		}
	}

	// ===== FALLBACK VISUALIZER (Safari/iOS) =====
	let fallbackAnimating = false;
	let lastLevel = 20;
	let trend = 0;
	let peakCountdown = 0;
	let silenceCountdown = 0;

	function initFallbackVisualizer() {
		console.log('🎨 Using fallback visualizer (Safari/iOS)');
		history = Array(historyLength).fill(0);
		fallbackAnimating = true;
		recording = true;
		lastLevel = 20;
		trend = 0;
		peakCountdown = 0;
		silenceCountdown = 0;
		updateFallbackVisualizer();
	}

	function updateFallbackVisualizer() {
		if (!fallbackAnimating) return;

		if (recording) {
			// Speech-like pattern with peaks and silences
			if (peakCountdown <= 0) {
				if (Math.random() < 0.1) {
					// Big peak (60-90%)
					lastLevel = 60 + Math.random() * 30;
					peakCountdown = 5 + Math.floor(Math.random() * 5);
					silenceCountdown = 0;
				} else if (Math.random() < 0.3) {
					// Medium peak (40-65%)
					lastLevel = 40 + Math.random() * 25;
					peakCountdown = 3 + Math.floor(Math.random() * 3);
					silenceCountdown = 0;
				} else if (Math.random() < 0.4) {
					// Silence/pause (5-15%)
					lastLevel = 5 + Math.random() * 10;
					silenceCountdown = 4 + Math.floor(Math.random() * 4);
				} else {
					// Regular speech (20-45%)
					lastLevel = 20 + Math.random() * 25;
					peakCountdown = 2 + Math.floor(Math.random() * 2);
				}
				trend = Math.random() < 0.5 ? -1 : 1;
			}

			// Handle silence periods
			if (silenceCountdown > 0) {
				lastLevel = Math.max(5, lastLevel * 0.8);
				silenceCountdown--;
			}

			// Breathing effect
			let breathEffect = Math.sin(Date.now() / 400) * 5;
			lastLevel += trend * (Math.random() * 4 - 1);
			lastLevel = Math.max(5, Math.min(90, lastLevel));
			peakCountdown--;

			let finalLevel = lastLevel + breathEffect + (Math.random() * 6 - 3);
			finalLevel = Math.max(5, Math.min(90, finalLevel));

			history = [finalLevel, ...history];
			if (history.length > historyLength) {
				history.pop();
			}
		} else {
			// Fade out when not recording
			history = history.map((level) => level * 0.8);
			let maxLevel = Math.max(...history);
			if (maxLevel < 2) {
				fallbackAnimating = false;
				history = Array(historyLength).fill(0);
				return;
			}
		}

		animationFrameId = requestAnimationFrame(updateFallbackVisualizer);
	}

	// ===== STANDARD VISUALIZER =====
	let frameSkipCounter = 0;
	const frameSkipRate = 2;

	function updateStandardVisualizer() {
		if (!recording || !analyser) return;

		// Slow down animation
		if (frameSkipCounter < frameSkipRate) {
			frameSkipCounter++;
			animationFrameId = requestAnimationFrame(updateStandardVisualizer);
			return;
		}
		frameSkipCounter = 0;

		const bufferLength = analyser.frequencyBinCount;
		audioDataArray = new Float32Array(bufferLength);
		analyser.getFloatFrequencyData(audioDataArray);

		let sum = 0;
		for (let i = 0; i < bufferLength; i++) {
			sum += audioDataArray[i];
		}

		let linearLevel = Math.max(0, sum / bufferLength + offset);
		let nonLinearLevel = Math.pow(linearLevel, exponent);
		audioLevel = Math.max(0, Math.min(100, nonLinearLevel * (100 / Math.pow(scalingFactor, exponent))));

		history = [audioLevel, ...history];
		if (history.length > historyLength) {
			history.pop();
		}

		animationFrameId = requestAnimationFrame(updateStandardVisualizer);
	}

	// ===== CONTROL FUNCTIONS =====
	function startVisualizer() {
		if (useFallbackVisualizer) {
			if (!fallbackAnimating) {
				fallbackAnimating = true;
				updateFallbackVisualizer();
			}
		} else if (recording && analyser) {
			history = Array(historyLength).fill(0);
			updateStandardVisualizer();
		}
	}

	function stopVisualizer() {
		recording = false;

		if (useFallbackVisualizer) {
			// Let it fade out naturally
		} else {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
			audioLevel = 0;
			history = [];
			if (audioContext) {
				audioContext.close();
				audioContext = null;
				analyser = null;
			}
		}
	}

	// ===== LIFECYCLE =====
	onMount(() => {
		if (useFallbackVisualizer) {
			initFallbackVisualizer();
		} else {
			initStandardVisualizer();
		}
	});

	onDestroy(() => {
		fallbackAnimating = false;
		stopVisualizer();
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
	});
</script>

<div class="visualizer-container">
	{#each history as level, index (index)}
		<div
			class="history-bar"
			style="height: {level}%; width: {100 / historyLength}%; left: {index *
				(100 / historyLength)}%"
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
		border-radius: 12px;
		overflow: hidden;
		background: linear-gradient(to bottom, rgba(255, 251, 245, 0.95), rgba(254, 240, 230, 0.85));
		box-shadow: inset 0 0 12px rgba(255, 200, 180, 0.15);
		contain: content;
	}

	.history-bar {
		position: absolute;
		bottom: 0;
		background: linear-gradient(to top, #ffa573, #ff9f9a, #ff7fcd, #ffb6f3);
		transition: height 0.15s ease-in-out;
		border-radius: 3px 3px 0 0;
		margin-right: 1px;
		box-shadow: 0 0 6px rgba(255, 180, 200, 0.25);
		opacity: 0.95;
		will-change: transform;
		transform: translateZ(0);
		backface-visibility: hidden;
	}
</style>
