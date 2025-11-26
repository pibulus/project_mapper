<script lang="ts">
	import { get } from 'svelte/store';
	import { currentProject, updateProject } from '$lib/stores/projectStore';

	let isAppending = false;
	let errorMessage = '';
	let fileInput: HTMLInputElement;

	function triggerFileDialog() {
		if (isAppending) return;
		fileInput?.click();
	}

	async function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		await appendAudioFile(file);
		target.value = '';
	}

	async function appendAudioFile(file: File) {
		const project = get(currentProject);
		if (!project) {
			errorMessage = 'No active project selected.';
			return;
		}

		isAppending = true;
		errorMessage = '';

		try {
			const formData = new FormData();
			formData.append('audio', file);
			formData.append('conversationId', project.id);
			formData.append('existingActionItems', JSON.stringify(project.actionItems || []));

			const response = await fetch('/api/append', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || 'Failed to append audio');
			}

			const result = await response.json();
			const newTranscriptSegment = result?.transcript?.text || '';
			const mergedTranscript = [project.transcript, newTranscriptSegment].filter(Boolean).join('\n\n');

			updateProject({
				transcript: mergedTranscript,
				summary: result.summary ?? project.summary,
				actionItems: result.actionItems ?? project.actionItems,
				topics: result.topics?.nodes ?? project.topics,
				edges: result.topics?.edges ?? project.edges
			});
		} catch (err: any) {
			console.error('❌ Error appending audio:', err);
			errorMessage = err?.message || 'Failed to append audio';
		} finally {
			isAppending = false;
		}
	}
</script>

<button class="btn btn-ghost" on:click={triggerFileDialog} disabled={isAppending}>
	{#if isAppending}
		<span>Appending…</span>
	{:else}
		<span>Append Audio</span>
	{/if}
</button>
<input
	bind:this={fileInput}
	type="file"
	accept="audio/*"
	style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;"
	on:change={handleFileChange}
/>
{#if errorMessage}
	<p class="append-error">{errorMessage}</p>
{/if}

<style>
	.append-error {
		font-size: var(--pm-text-xs);
		color: var(--pm-pink);
		margin-top: 0.25rem;
		text-align: right;
	}
</style>
