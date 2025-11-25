<script lang="ts">
	/**
	 * SummaryCard Component
	 *
	 * Displays AI-generated summary. Gets data from the projectStore.
	 */
	import { currentProject } from '$lib/stores/projectStore';
	import Card from './ui/Card.svelte';

	$: summary = $currentProject?.summary || '';
	$: topicsCount = $currentProject?.topics?.length || 0;
</script>

<Card title="✨ Summary">
	{#if !summary}
		<p class="empty-state">No summary yet</p>
	{:else}
		<p
			style="
				font-size: var(--pm-text-sm);
				line-height: 1.7;
				color: var(--pm-black);
				margin-bottom: 1rem;
			"
		>
			{summary}
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
