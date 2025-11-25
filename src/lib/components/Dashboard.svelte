<script lang="ts">
	/**
	 * Dashboard Component
	 *
	 * Simple CSS Grid layout coordinating all cards
	 * Subscribes to real-time updates from the partyStore
	 */
	import { currentProject } from '$lib/stores/projectStore';
	import { createProjectParty } from '$lib/stores/partyStore';
	import TranscriptCard from './TranscriptCard.svelte';
	import SummaryCard from './SummaryCard.svelte';
	import ActionItemsCard from './ActionItemsCard.svelte';
	import TopicGraphCard from './TopicGraphCard.svelte';
	import { onMount } from 'svelte';

	let party;

	// When the current project changes, connect to the party if sync is enabled
	currentProject.subscribe((project) => {
		if (project?.id && project.syncEnabled) {
			party = createProjectParty(project.id);
		} else {
			party = null;
		}
	});

	// Data can come from the real-time party store OR the local project store
	$: transcript = party ? party.transcript : $currentProject?.transcript;
	$: summary = party ? party.summary : $currentProject?.summary;
	$: actionItems = party ? party.actionItems : $currentProject?.actionItems;
	$: topics = party ? party.nodes : $currentProject?.topics;
	$: edges = party ? party.edges : $currentProject?.edges;
	$: conversation = party ? party.conversation : $currentProject;
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
		<TranscriptCard transcript={$transcript || ''} />

		<!-- Card 2: Summary -->
		<SummaryCard summary={$summary || ''} topicsCount={$topics?.length || 0} />

		<!-- Card 3: Action Items -->
		<ActionItemsCard items={$actionItems || []} />

		<!-- Card 4: Topic Graph (full width) -->
		<div class="md:col-span-2 lg:col-span-3">
			<TopicGraphCard topics={$topics || []} edges={$edges || []} />
		</div>
	</div>
{/if}
