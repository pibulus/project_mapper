<script lang="ts">
	/**
	 * TranscriptCard Component
	 *
	 * Displays the conversation transcript. Gets data from the projectStore.
	 */
	import { currentProject } from '$lib/stores/projectStore';
	import Card from './ui/Card.svelte';
	import { topicSelection } from '$lib/stores/topicSelection';
	import { textMatchesTopic } from '$lib/utils/topicUtils';

	const { hoveredTopic, selectedTopic } = topicSelection;

	$: transcript = $currentProject?.transcript || '';
	$: lines = transcript.split('\n').filter((line) => line.trim());
	$: activeTopic = $hoveredTopic || $selectedTopic;

	let lineRefs: HTMLParagraphElement[] = [];
	let pulsingIndex = -1;
	let pulseTimeout: ReturnType<typeof setTimeout> | null = null;

	function lineMatchesTopic(line: string): boolean {
		return textMatchesTopic(line, activeTopic);
	}

	function scrollToLine(index: number) {
		const el = lineRefs[index];
		if (!el) return;
		el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		pulsingIndex = index;
		if (pulseTimeout) {
			clearTimeout(pulseTimeout);
		}
		pulseTimeout = setTimeout(() => {
			pulsingIndex = -1;
		}, 900);
	}

	$: if (activeTopic) {
		const targetIndex = lines.findIndex((line) => lineMatchesTopic(line));
		if (targetIndex >= 0) {
			scrollToLine(targetIndex);
		}
	}
</script>

<Card title="📝 Transcript">
	<div style="max-height: 400px; overflow-y: auto;">
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
	.line-highlight {
		background: rgba(255, 105, 180, 0.15);
		box-shadow: inset 0 0 0 1px rgba(255, 105, 180, 0.4);
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
