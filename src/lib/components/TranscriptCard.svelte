<script lang="ts">
	/**
	 * TranscriptCard Component
	 *
	 * Displays the conversation transcript. Gets data from the projectStore.
	 */
	import { currentProject } from '$lib/stores/projectStore';
	import Card from './ui/Card.svelte';

	$: transcript = $currentProject?.transcript || '';
	$: lines = transcript.split('\n').filter((line) => line.trim());
</script>

<Card title="📝 Transcript">
	<div style="max-height: 400px; overflow-y: auto;">
		{#if lines.length === 0}
			<p style="color: var(--pm-brown); opacity: 0.6; font-style: italic;">No transcript yet</p>
		{:else}
			<div style="display: flex; flex-direction: column; gap: 0.5rem;">
				{#each lines as line}
					<p
						style="
						font-size: var(--pm-text-sm);
						line-height: 1.6;
						color: var(--pm-black);
					"
					>
						{line}
					</p>
				{/each}
			</div>
		{/if}
	</div>
</Card>
