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
	import { swipe } from '$lib/actions/swipe';
	import { onMount } from 'svelte';

	// Define party type loosely to avoid 'any' errors
	type PartyStore = {
		transcript: any;
		summary: any;
		actionItems: any;
		nodes: any;
		edges: any;
		conversation: any;
		send: (type: string, data?: any) => void;
	};

	let party: PartyStore | null = null;

	// When the current project changes, connect to the party if sync is enabled
	currentProject.subscribe((project) => {
		if (project?.id && project.syncEnabled) {
			party = createProjectParty(project.id) as unknown as PartyStore;
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

	// Mobile Carousel State
	let activePanel = 0;
	const panels = ['transcript', 'summary', 'action-items', 'graph'];

	function nextPanel() {
		if (activePanel < panels.length - 1) activePanel++;
	}

	function prevPanel() {
		if (activePanel > 0) activePanel--;
	}

	function setPanel(index: number) {
		activePanel = index;
	}
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
	<!-- Mobile Swipe Container -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div 
		class="mobile-carousel"
		use:swipe
		on:swipeleft={nextPanel}
		on:swiperight={prevPanel}
	>
		<div class="dashboard-grid" class:mobile-active={true}>
			<section class="panel transcript" class:active={activePanel === 0}>
				<TranscriptCard />
			</section>
			<section class="panel summary" class:active={activePanel === 1}>
				<SummaryCard />
			</section>
			<section class="panel action-items" class:active={activePanel === 2}>
				<ActionItemsCard />
			</section>
			<section class="panel graph" class:active={activePanel === 3}>
				<TopicGraphCard partySend={party ? party.send : null} />
			</section>
		</div>

		<!-- Mobile Dots Navigation -->
		<div class="mobile-dots">
			{#each panels as _, i}
				<button 
					class="dot" 
					class:active={activePanel === i}
					on:click={() => setPanel(i)}
					aria-label="Go to panel {i + 1}"
				></button>
			{/each}
		</div>
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

	/* Mobile Carousel Styles */
	.mobile-carousel {
		width: 100%;
		overflow: hidden;
	}

	.mobile-dots {
		display: none; /* Hidden on desktop */
		justify-content: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding-bottom: 1rem;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(30, 23, 20, 0.2);
		border: none;
		padding: 0;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.dot.active {
		background: var(--pm-black);
		transform: scale(1.2);
	}

	@media (max-width: 767px) {
		.dashboard-grid {
			display: flex; /* Switch to flex for carousel effect if needed, or just hide/show */
			flex-direction: column;
			gap: 0;
		}

		.panel {
			display: none; /* Hide all by default */
			width: 100%;
			animation: fadeIn 0.3s ease;
		}

		.panel.active {
			display: block; /* Show only active */
		}

		.mobile-dots {
			display: flex;
		}
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(5px); }
		to { opacity: 1; transform: translateY(0); }
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
