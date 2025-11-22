<script lang="ts">
	/**
	 * TranscriptCard Component
	 *
	 * Displays the conversation transcript
	 */
	export let transcript: string;

	// Format transcript with speaker labels
	$: lines = transcript.split('\n').filter(line => line.trim());
</script>

<div class="card h-full flex flex-col">
	<div class="card-header">
		<h3 class="text-lg font-bold">📝 Transcript</h3>
	</div>
	<div class="card-body flex-1 overflow-y-auto max-h-96">
		{#if lines.length === 0}
			<p class="text-gray-500 italic">No transcript yet</p>
		{:else}
			<div class="space-y-2 text-sm">
				{#each lines as line}
					<p class="leading-relaxed">{line}</p>
				{/each}
			</div>
		{/if}
	</div>
</div>
