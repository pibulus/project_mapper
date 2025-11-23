<script lang="ts">
	/**
	 * SummaryCard Component
	 *
	 * Displays AI-generated summary
	 */
	export let summary: string;
	export let topicsCount: number = 0;
</script>

<div class="card">
	<div class="card-header">
		<h3>✨ Summary</h3>
	</div>
	<div class="card-body">
		{#if !summary}
			<p style="color: var(--pm-brown); opacity: 0.6; font-style: italic;">No summary yet</p>
		{:else}
			<p style="
				font-size: var(--pm-text-sm);
				line-height: 1.7;
				color: var(--pm-black);
				margin-bottom: 1rem;
			">
				{summary}
			</p>
			{#if topicsCount > 0}
				<div style="
					margin-top: 1rem;
					padding-top: 1rem;
					border-top: var(--pm-border-thin) solid rgba(30, 23, 20, 0.1);
				">
					<p style="
						font-size: var(--pm-text-xs);
						color: var(--pm-brown);
					">
						<span style="font-weight: 700; color: var(--pm-pink);">{topicsCount}</span> topics identified
					</p>
				</div>
			{/if}
		{/if}
	</div>
</div>
