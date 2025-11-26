<script lang="ts">
	/**
	 * SummaryCard Component
	 *
	 * Displays AI-generated summary. Gets data from the projectStore.
	 */
	import { currentProject } from '$lib/stores/projectStore';
	import Card from './ui/Card.svelte';
	import { topicSelection } from '$lib/stores/topicSelection';
	import { highlightTextForTopic } from '$lib/utils/topicUtils';

	const { hoveredTopic, selectedTopic } = topicSelection;

	$: summary = $currentProject?.summary || '';
	$: topicsCount = $currentProject?.topics?.length || 0;
	$: activeTopic = $hoveredTopic || $selectedTopic;
	$: highlightedSummary = highlightTextForTopic(summary, activeTopic);
</script>

<Card title="✨ Summary">
	{#if !summary}
		<p class="empty-state">No summary yet</p>
	{:else}
		<p
			class:summary-highlighted={!!activeTopic}
			style="
				font-size: var(--pm-text-sm);
				line-height: 1.7;
				color: var(--pm-black);
				margin-bottom: 1rem;
			"
		>
			{@html highlightedSummary}
		</p>
		{#if topicsCount > 0}
			<div
				style="
					margin-top: 1rem;
					padding-top: 1rem;
					border-top: var(--pm-border-thin) solid rgba(30, 23, 20, 0.1);
				"
			>
				<p style="font-size: var(--pm-text-xs); color: var(--pm-brown);">
					<span style="font-weight: 700; color: var(--pm-pink);">{topicsCount}</span> topics
					identified
				</p>
			</div>
		{/if}
	{/if}
</Card>

<style>
	.topic-highlight {
		background: rgba(255, 105, 180, 0.2);
		padding: 0 0.15rem;
		border-radius: var(--pm-radius-sm);
	}

	.summary-highlighted {
		transition: background-color var(--pm-transition-fast);
	}
</style>
