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

	let exportDrawerOpen = false;

	// Auto-restore from localStorage on mount
	onMount(() => {
		loadFromLocalStorage();
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50">
	<!-- Header -->
	<header
		class="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b-2 border-gray-200 shadow-sm"
	>
		<div class="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
			{#if $currentProject}
				<!-- Project header -->
				<div class="flex items-center gap-3 flex-1 min-w-0">
					<button
						on:click={() => ($currentProject = null)}
						class="flex-shrink-0 w-9 h-9 rounded-lg border-2 border-gray-300 hover:bg-gray-100 transition-all flex items-center justify-center"
						title="Back to home"
					>
						←
					</button>
					<h1 class="text-2xl font-bold truncate text-gray-900">
						{$currentProject.title || 'Untitled Project'}
					</h1>
				</div>
				<div class="flex items-center gap-2">
					<!-- Export button -->
					<button
						on:click={() => (exportDrawerOpen = true)}
						class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-semibold"
					>
						Export
					</button>
				</div>
			{:else}
				<!-- App header -->
				<h1 class="text-2xl font-bold text-gray-900">Project Mapper</h1>
			{/if}
		</div>
	</header>

	<!-- Main content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
		{#if $currentProject}
			<!-- Show dashboard when project exists -->
			<Dashboard />
		{:else}
			<!-- Show hero + upload when no project -->
			<div class="max-w-3xl mx-auto">
				<!-- Hero section -->
				<div class="text-center mb-12">
					<h2 class="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
						Living AI Workspace
					</h2>
					<p class="text-xl text-gray-600">
						Where projects evolve through conversation, collaboration, and continuous intelligence
					</p>
				</div>

				<!-- Upload section -->
				<Upload />

				<!-- Features grid -->
				<div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
					<div class="card card-body text-center">
						<div class="text-3xl mb-2">🎙️</div>
						<h3 class="font-bold mb-2">Audio + Text</h3>
						<p class="text-sm text-gray-600">Upload recordings or paste text for instant analysis</p>
					</div>
					<div class="card card-body text-center">
						<div class="text-3xl mb-2">🤖</div>
						<h3 class="font-bold mb-2">AI Intelligence</h3>
						<p class="text-sm text-gray-600">Auto-generated action items, topics, and summaries</p>
					</div>
					<div class="card card-body text-center">
						<div class="text-3xl mb-2">👥</div>
						<h3 class="font-bold mb-2">Real-time Collab</h3>
						<p class="text-sm text-gray-600">Multiplayer workspace with live presence</p>
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
