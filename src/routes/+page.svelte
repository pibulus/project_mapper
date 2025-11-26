<script lang="ts">
	/**
	 * ProMap - Main Page
	 *
	 * Conditional layout:
	 * - No project: Show hero + upload UI
	 * - Active project: Show dashboard with cards
	 */
	import { onMount } from 'svelte';
	import { currentProject, loadFromLocalStorage } from '$lib/stores/projectStore';
	import Upload from '$lib/components/Upload.svelte';
	import Dashboard from '$lib/components/Dashboard.svelte';
	import ExportDrawer from '$lib/components/ExportDrawer.svelte';
import TopicTooltip from '$lib/components/TopicTooltip.svelte';
import ProjectHeader from '$lib/components/ProjectHeader.svelte';

	let exportDrawerOpen = false;

	// Auto-restore from localStorage on mount
	onMount(() => {
		loadFromLocalStorage();
	});
</script>

<div class="min-h-screen">
	<!-- Header -->
	{#if $currentProject}
		<ProjectHeader
			project={$currentProject}
			on:back={() => ($currentProject = null)}
			on:export={() => (exportDrawerOpen = true)}
		/>
	{:else}
		<header class="app-header">
			<h1>Project Mapper</h1>
		</header>
	{/if}

	<!-- Main content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6" style="padding-top: clamp(2rem, 4vh, 3rem);">
		{#if $currentProject}
			<!-- Show dashboard when project exists -->
			<Dashboard />
			<TopicTooltip />
		{:else}
			<!-- Hero section - Glass card with upload inside -->
			<div class="max-w-4xl mx-auto">
				<div class="glass-card" style="padding: clamp(2rem, 4vw, 3rem);">
					<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center;">
						<!-- Left: Hero copy -->
						<div>
							<div style="
								font-size: var(--pm-text-sm);
								font-weight: 600;
								color: var(--pm-pink);
								letter-spacing: 0.05em;
								text-transform: uppercase;
								margin-bottom: 1rem;
							">
								Welcome to Project Mapper
							</div>
							<h1 style="
								font-size: clamp(2rem, 5vw, 3rem);
								font-weight: 800;
								color: var(--pm-black);
								line-height: 1.1;
								margin-bottom: 1.5rem;
							">
								See what you're<br />really saying
							</h1>
							<p style="
								font-size: var(--pm-text-base);
								color: var(--pm-brown);
								line-height: 1.6;
								margin-bottom: 1rem;
							">
								Build a confident map for every conversation—stable layout, playful controls,
								no resizing jump scares when you switch modes.
							</p>
							<p style="
								font-size: var(--pm-text-sm);
								color: var(--pm-brown);
								opacity: 0.7;
							">
								Record / Paste / Upload — same module, same rhythm.
							</p>
						</div>

						<!-- Right: Upload panel -->
						<div>
							<Upload />
						</div>
					</div>
				</div>

				<!-- Features grid -->
				<div style="
					margin-top: clamp(3rem, 6vh, 4rem);
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
					gap: 1.5rem;
				">
					<div class="card">
						<div class="card-body" style="text-align: center;">
							<div style="font-size: 2rem; margin-bottom: 0.5rem;">🎙️</div>
							<h3 style="font-weight: 700; margin-bottom: 0.5rem;">Audio + Text</h3>
							<p style="font-size: var(--pm-text-sm); color: var(--pm-brown);">
								Upload recordings or paste text for instant analysis
							</p>
						</div>
					</div>
					<div class="card">
						<div class="card-body" style="text-align: center;">
							<div style="font-size: 2rem; margin-bottom: 0.5rem;">🤖</div>
							<h3 style="font-weight: 700; margin-bottom: 0.5rem;">AI Intelligence</h3>
							<p style="font-size: var(--pm-text-sm); color: var(--pm-brown);">
								Auto-generated action items, topics, and summaries
							</p>
						</div>
					</div>
					<div class="card">
						<div class="card-body" style="text-align: center;">
							<div style="font-size: 2rem; margin-bottom: 0.5rem;">👥</div>
							<h3 style="font-weight: 700; margin-bottom: 0.5rem;">Real-time Collab</h3>
							<p style="font-size: var(--pm-text-sm); color: var(--pm-brown);">
								Multiplayer workspace with live presence
							</p>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</main>

	<!-- Export Drawer -->
	<ExportDrawer
		bind:isOpen={exportDrawerOpen}
		transcript={$currentProject?.transcript || ''}
	/>
</div>

<style>
	/* Responsive grid for hero */
	@media (max-width: 768px) {
		.glass-card > div {
			grid-template-columns: 1fr !important;
			gap: 2rem !important;
		}
	}

	.app-header {
		background: var(--pm-glass-bg);
		border-bottom: var(--pm-border-medium) solid rgba(30, 23, 20, 0.08);
		box-shadow: var(--pm-shadow-soft);
		padding: 1.5rem 1rem;
		text-align: center;
	}

	.app-header h1 {
		font-size: var(--pm-text-2xl);
		font-weight: 800;
		color: var(--pm-black);
		letter-spacing: -0.03em;
		margin: 0;
	}
</style>
