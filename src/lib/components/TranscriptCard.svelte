<script lang="ts">
	/**
	 * TranscriptCard Component
	 *
	 * Displays the conversation transcript
	 */
	export let transcript: string;

	// Format transcript with speaker labels
	$: lines = transcript.split('\n').filter((line) => line.trim());
</script>

<div class="card">
	<div class="card-header">
		<h3>📝 Transcript</h3>
	</div>
	<div class="card-body" style="max-height: 400px; overflow-y: auto;">
		{#if lines.length === 0}
			<p style="color: var(--pm-brown); opacity: 0.6; font-style: italic;">No transcript yet</p>
		{:else}
			<div style="display: flex; flex-direction: column; gap: 0.5rem;">
				{#each lines as line}
					<p style="
						font-size: var(--pm-text-sm);
						line-height: 1.6;
						color: var(--pm-black);
					">
						{line}
					</p>
				{/each}
			</div>
		{/if}
	</div>
</div>
