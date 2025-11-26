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
	<div class="dashboard-grid loading">
		{#each Array(4) as _, i}
			<div class="card card-body animate-pulse">
				<div class="skeleton-line w-3/4"></div>
				<div class="skeleton-line w-full"></div>
				<div class="skeleton-line w-5/6"></div>
				<div class="skeleton-line w-4/6"></div>
			</div>
		{/each}
	</div>
{:else}
	<div class="dashboard-grid">
		<section class="panel transcript">
			<TranscriptCard />
		</section>
		<section class="panel summary">
			<SummaryCard />
		</section>
		<section class="panel action-items">
			<ActionItemsCard />
		</section>
		<section class="panel graph">
			<TopicGraphCard partySend={party ? party.send : null} />
		</section>
	</div>
{/if}

<style>
	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		gap: clamp(1rem, 2vw, 1.5rem);
	}

	.panel {
		grid-column: span 12;
	}

	@media (min-width: 768px) {
		.panel.transcript {
			grid-column: span 12;
		}
		.panel.summary {
			grid-column: span 12;
		}
		.panel.action-items {
			grid-column: span 12;
		}
	}

	@media (min-width: 1024px) {
		.panel.transcript {
			grid-column: span 8;
		}
		.panel.summary {
			grid-column: span 4;
		}
		.panel.action-items {
			grid-column: span 12;
		}
	}

	.panel.graph {
		grid-column: span 12;
	}

	.dashboard-grid.loading .card {
		min-height: 160px;
	}

	.skeleton-line {
		height: 0.75rem;
		background: rgba(30, 23, 20, 0.08);
		border-radius: 999px;
		margin-bottom: 0.5rem;
	}
</style>
