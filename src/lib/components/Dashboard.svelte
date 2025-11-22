<script lang="ts">
	/**
	 * Dashboard Component
	 *
	 * Simple CSS Grid layout coordinating all cards
	 * Pattern from conversation_mapper_fresh/DashboardIsland.tsx
	 */
	import { currentProject } from '$lib/stores/projectStore';
	import TranscriptCard from './TranscriptCard.svelte';
	import SummaryCard from './SummaryCard.svelte';
	import ActionItemsCard from './ActionItemsCard.svelte';
	import TopicGraphCard from './TopicGraphCard.svelte';

	// Extract data from current project
	$: transcript = $currentProject?.transcript || '';
	$: summary = $currentProject?.summary || '';
	$: actionItems = $currentProject?.actionItems || [];
	$: topics = $currentProject?.topics || [];
	$: edges = $currentProject?.edges || [];
</script>

{#if !$currentProject}
	<!-- Loading skeleton -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each Array(4) as _, i}
			<div class="card card-body animate-pulse">
				<div class="h-4 bg-gray-200 rounded mb-3 w-3/4"></div>
				<div class="h-3 bg-gray-200 rounded mb-2 w-full"></div>
				<div class="h-3 bg-gray-200 rounded mb-2 w-5/6"></div>
				<div class="h-3 bg-gray-200 rounded w-4/6"></div>
			</div>
		{/each}
	</div>
{:else}
	<!-- Dashboard grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		<!-- Card 1: Transcript -->
		<TranscriptCard {transcript} />

		<!-- Card 2: Summary -->
		<SummaryCard {summary} topicsCount={topics.length} />

		<!-- Card 3: Action Items -->
		<ActionItemsCard items={actionItems} />

		<!-- Card 4: Topic Graph (full width) -->
		<div class="md:col-span-2 lg:col-span-3">
			<TopicGraphCard {topics} {edges} />
		</div>
	</div>
{/if}
