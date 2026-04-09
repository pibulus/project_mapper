<script lang="ts">
	/**
	 * ExportDrawer Component
	 *
	 * Right-hand slide-in drawer for exporting conversation to different formats
	 * Combines the best from both versions:
	 * - Svelte transitions for smooth animations
	 * - Format system from Fresh
	 */
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { EXPORT_FORMATS } from '$lib/core/export/formats';

	export let isOpen = false;
	export let transcript = '';

	let selectedFormat: string | null = null;
	let generatedMarkdown = '';
	let isGenerating = false;
	let error = '';

	// Available export formats with descriptions
	const formats = [
		{ id: 'blog', label: '📝 Blog Post', desc: 'Formatted article with sections' },
		{ id: 'manual', label: '📖 Technical Manual', desc: 'Step-by-step guide' },
		{ id: 'summary', label: '📋 Executive Summary', desc: 'High-level overview' },
		{ id: 'haiku', label: '🎋 Haiku', desc: 'Poetic 3-line summary' }
	];

	async function generateExport(format: string) {
		if (!transcript) {
			error = 'No transcript available';
			return;
		}

		selectedFormat = format;
		isGenerating = true;
		error = '';
		generatedMarkdown = '';

		try {
			const response = await fetch('/api/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					transcript,
					format
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to generate export');
			}

			const result = await response.json();
			generatedMarkdown = result.markdown;
		} catch (err: any) {
			console.error('Error generating export:', err);
			error = err.message || 'Failed to generate export';
		} finally {
			isGenerating = false;
		}
	}

	function copyToClipboard() {
		if (!generatedMarkdown) return;

		navigator.clipboard.writeText(generatedMarkdown).then(
			() => {
				// Show success toast (simple version)
				alert('Copied to clipboard!');
			},
			(err) => {
				console.error('Failed to copy:', err);
				error = 'Failed to copy to clipboard';
			}
		);
	}

	function handleClose() {
		isOpen = false;
		// Reset state after animation
		setTimeout(() => {
			selectedFormat = null;
			generatedMarkdown = '';
			error = '';
		}, 300);
	}

	// Handle ESC key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			handleClose();
		}
	}

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 z-40"
		on:click={handleClose}
		on:keydown={handleBackdropKeydown}
		transition:fade={{ duration: 200 }}
		role="button"
		tabindex="0"
		aria-label="Close drawer"
	></div>

	<!-- Drawer -->
	<div
		class="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white shadow-2xl z-50 overflow-y-auto"
		transition:fly={{ x: 500, duration: 300, easing: cubicOut }}
	>
		<!-- Header -->
		<div class="sticky top-0 bg-white border-b-2 border-gray-200 px-6 py-4 flex items-center justify-between z-10">
			<h2 class="text-2xl font-bold">Export Conversation</h2>
			<button
				on:click={handleClose}
				class="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center text-2xl transition-colors"
				aria-label="Close"
			>
				✕
			</button>
		</div>

		<!-- Content -->
		<div class="p-6 space-y-6">
			{#if !selectedFormat}
				<!-- Format Selection -->
				<div class="space-y-3">
					<p class="text-gray-600 mb-4">Choose an export format:</p>
					{#each formats as format}
						<button
							on:click={() => generateExport(format.id)}
							class="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-all group"
						>
							<div class="flex items-center justify-between">
								<div>
									<div class="font-semibold text-lg group-hover:text-pink-600 transition-colors">
										{format.label}
									</div>
									<div class="text-sm text-gray-600 mt-1">{format.desc}</div>
								</div>
								<div class="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">
									→
								</div>
							</div>
						</button>
					{/each}
				</div>
			{:else}
				<!-- Generated Output -->
				<div class="space-y-4">
					<!-- Back button -->
					<button
						on:click={() => {
							selectedFormat = null;
							generatedMarkdown = '';
							error = '';
						}}
						class="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
					>
						← Back to formats
					</button>

					{#if isGenerating}
						<!-- Loading state -->
						<div class="flex items-center justify-center py-12">
							<div class="text-center">
								<div class="inline-block animate-spin text-4xl mb-4">⚙️</div>
								<p class="text-gray-600">Generating your {selectedFormat}...</p>
							</div>
						</div>
					{:else if error}
						<!-- Error state -->
						<div class="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
							<p class="text-red-700">{error}</p>
						</div>
					{:else if generatedMarkdown}
						<!-- Success state -->
						<div class="space-y-4">
							<!-- Action buttons -->
							<div class="flex gap-2">
								<button
									on:click={copyToClipboard}
									class="flex-1 btn btn-primary"
								>
									📋 Copy to Clipboard
								</button>
							</div>

							<!-- Preview -->
							<div class="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 max-h-[500px] overflow-y-auto">
								<pre class="whitespace-pre-wrap text-sm font-mono">{generatedMarkdown}</pre>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
