<script lang="ts">
	/**
	 * Loading Modal - Beautiful Animated Fullscreen Loader
	 *
	 * Features:
	 * - Random loading messages with personality
	 * - Random emoji animations (pulse & glow)
	 * - Letter-by-letter bounce animation
	 * - Floating glassmorphism card
	 * - Animated gradient border with warm pastel punk colors
	 * - Prevents body scroll when active
	 */
	import { onMount, onDestroy } from 'svelte';

	export let isOpen = false;

	// Chill, vibey loading messages
	const LOADING_MESSAGES = [
		'loading your vibe...',
		'syncing the wavelengths...',
		'tuning the frequencies...',
		'assembling your dashboard...',
		'connecting the dots...',
		'setting the mood...',
		'capturing conversations...',
		'mapping the topics...',
		'finding the insights...',
		'organizing your thoughts...'
	];

	// Modern, chill vibes emoji sets
	const LOADING_EMOJIS = ['🪩', '✨', '💫', '🔮', '💎', '🌟', '🌊', '⚡'];

	// Get random item from array
	function getRandomItem<T>(array: T[]): T {
		return array[Math.floor(Math.random() * array.length)];
	}

	const loadingMessage = getRandomItem(LOADING_MESSAGES);
	const loadingEmoji = getRandomItem(LOADING_EMOJIS);

	// Prevent body scroll when modal is open
	$: {
		if (typeof document !== 'undefined') {
			if (isOpen) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}
		}
	}

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.body.style.overflow = '';
		}
	});
</script>

{#if isOpen}
	<div class="loading-modal">
		<div class="loading-container">
			<div class="loading-box">
				<!-- Emoji Row -->
				<div class="emoji-row">
					<span class="emoji-pulse">{loadingEmoji}</span>
				</div>

				<!-- Loading Text with Bounce Animation -->
				<div class="loading-text">
					{#each loadingMessage.split('') as letter, i}
						<span class="bounce-letter" style="--delay: {i * 0.05}s">{letter}</span>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Modal overlay */
	.loading-modal {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(30, 23, 20, 0.75);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	/* Container with animated border */
	.loading-container {
		position: relative;
		padding: 2px;
		border-radius: 20px;
		background: var(--pm-cream-light);
		box-shadow: 0 20px 40px rgba(30, 23, 20, 0.3);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.loading-container::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: 20px;
		padding: 2px;
		/* Warm pastel punk gradient - pink to peach */
		background: linear-gradient(
			135deg,
			rgba(232, 131, 156, 0.5),
			rgba(255, 209, 163, 0.3),
			rgba(232, 131, 156, 0.5),
			rgba(255, 209, 163, 0.3)
		);
		-webkit-mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		pointer-events: none;
		animation: border-glow 3s infinite linear;
		background-size: 300% 300%;
	}

	/* Main box with float animation */
	.loading-box {
		padding: 2.5rem 3.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		min-width: 380px;
		min-height: 200px;
		border-radius: 18px;
		background: var(--pm-cream);
		animation: float 3s ease-in-out infinite;
	}

	/* Emoji row */
	.emoji-row {
		text-align: center;
		margin-bottom: 1.75rem;
	}

	.emoji-pulse {
		font-size: 2.4rem;
		display: inline-block;
		animation: pulse-glow 2s ease-in-out infinite;
		filter: drop-shadow(0 0 8px rgba(232, 131, 156, 0.6));
	}

	/* Loading text */
	.loading-text {
		width: 100%;
		text-align: center;
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: 0.5px;
		color: var(--pm-black);
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		min-height: 1.5em;
		gap: 0.1rem;
	}

	/* Individual letter bounce */
	.bounce-letter {
		display: inline-block;
		animation: letter-bounce 1.5s infinite;
		animation-delay: var(--delay, 0s);
	}

	/* ===================================================================
	 * ANIMATIONS
	 * ================================================================= */

	@keyframes letter-bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		40% {
			transform: translateY(-6px);
		}
		60% {
			transform: translateY(3px);
		}
	}

	@keyframes pulse-glow {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
			filter: brightness(1) drop-shadow(0 0 8px rgba(232, 131, 156, 0.6));
		}
		50% {
			opacity: 0.95;
			transform: scale(1.12);
			filter: brightness(1.3) drop-shadow(0 0 12px rgba(255, 209, 163, 0.8));
		}
	}

	@keyframes float {
		0% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-12px);
		}
		100% {
			transform: translateY(0px);
		}
	}

	@keyframes border-glow {
		0% {
			background-position: 0% 0%;
		}
		100% {
			background-position: 300% 300%;
		}
	}

	/* ===================================================================
	 * RESPONSIVE
	 * ================================================================= */

	@media (max-width: 640px) {
		.loading-box {
			min-width: 300px;
			padding: 2rem 2.5rem;
		}

		.loading-text {
			font-size: 1.1rem;
		}

		.emoji-pulse {
			font-size: 2rem;
		}
	}
</style>
