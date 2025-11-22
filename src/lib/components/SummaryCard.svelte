<script lang="ts">
	/**
	 * SummaryCard Component
	 *
	 * Displays AI-generated summary
	 */
	export let summary: string;
	export let topicsCount: number = 0;
</script>

<div class="card h-full flex flex-col">
	<div class="card-header">
		<h3 class="text-lg font-bold">✨ Summary</h3>
	</div>
	<div class="card-body flex-1">
		{#if !summary}
			<p class="text-gray-500 italic">No summary yet</p>
		{:else}
			<p class="text-sm leading-relaxed mb-4">{summary}</p>
			{#if topicsCount > 0}
				<div class="mt-4 pt-4 border-t-2 border-gray-100">
					<p class="text-xs text-gray-600">
						<span class="font-semibold">{topicsCount}</span> topics identified
					</p>
				</div>
			{/if}
		{/if}
	</div>
</div>
