<script lang="ts">
	import { topicSelection } from '$lib/stores/topicSelection';

	const { hoveredTopic, selectedTopic, remoteSelections, remoteHovers } = topicSelection;

	$: topic = $hoveredTopic || $selectedTopic;
	$: remoteCount = topic
		? new Set(
				[
					...Object.entries($remoteSelections || {})
						.filter(([, remote]) => remote?.id === topic.id)
						.map(([userId]) => userId),
					...Object.entries($remoteHovers || {})
						.filter(([, remote]) => remote?.id === topic.id)
						.map(([userId]) => userId)
				]
		  ).size
		: 0;
</script>

{#if topic}
	<div class="topic-tooltip" role="status" aria-live="polite">
		<span class="emoji">{topic.emoji || '🧠'}</span>
		<div class="details">
			<span class="label">{topic.label}</span>
			{#if topic.color}
				<span class="dot" style="background: {topic.color};"></span>
			{/if}
			{#if remoteCount > 0}
				<span class="remote-chip">{remoteCount}✦</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	.topic-tooltip {
		position: fixed;
		bottom: 1.25rem;
		right: 1.25rem;
		background: rgba(255, 255, 255, 0.95);
		border: var(--pm-border-medium) solid rgba(30, 23, 20, 0.12);
		border-radius: var(--pm-radius-lg);
		box-shadow: 0 12px 30px rgba(30, 23, 20, 0.15);
		padding: 0.5rem 0.85rem;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		z-index: 999;
		min-width: 180px;
		animation: fadeIn 180ms ease-out;
	}

	.emoji {
		font-size: 1.25rem;
	}

	.details {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-weight: 600;
		font-size: var(--pm-text-sm);
		color: var(--pm-brown);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		display: inline-block;
	}

	.remote-chip {
		font-size: var(--pm-text-xs);
		background: rgba(255, 105, 180, 0.12);
		border-radius: 999px;
		padding: 0.1rem 0.4rem;
		border: 1px solid rgba(255, 105, 180, 0.4);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 640px) {
		.topic-tooltip {
			bottom: 0.85rem;
			right: 0.85rem;
			min-width: 150px;
		}
	}
</style>
