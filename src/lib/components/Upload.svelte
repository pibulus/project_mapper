<script lang="ts">
	/**
	 * Upload Component
	 *
	 * Handles audio file upload and text input
	 * Sends to /api/process for AI analysis
	 */
	import { currentProject, updateProject } from '$lib/stores/projectStore';

	let mode: 'audio' | 'text' = 'audio';
	let audioFile: File | null = null;
	let textInput = '';
	let isProcessing = false;
	let error = '';

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			audioFile = target.files[0];
			error = '';
		}
	}

	async function processAudio() {
		if (!audioFile) {
			error = 'Please select an audio file';
			return;
		}

		isProcessing = true;
		error = '';

		try {
			const formData = new FormData();
			formData.append('audio', audioFile);
			formData.append('conversationId', crypto.randomUUID());

			const response = await fetch('/api/process', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to process audio');
			}

			const result = await response.json();

			// Build project from result
			const project = {
				id: result.conversation.id,
				title: result.conversation.title || 'Untitled Project',
				summary: result.summary || '',
				transcript: result.transcript.text || '',
				actionItems: result.actionItems || [],
				topics: result.nodes || [],
				edges: result.edges || []
			};

			updateProject(project);
			currentProject.set(project);

			// Reset form
			audioFile = null;
			textInput = '';
		} catch (err: any) {
			console.error('Error processing audio:', err);
			error = err.message || 'Failed to process audio';
		} finally {
			isProcessing = false;
		}
	}

	async function processText() {
		if (!textInput.trim()) {
			error = 'Please enter some text';
			return;
		}

		isProcessing = true;
		error = '';

		try {
			const response = await fetch('/api/process', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					text: textInput,
					conversationId: crypto.randomUUID()
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to process text');
			}

			const result = await response.json();

			// Build project from result
			const project = {
				id: result.conversation.id,
				title: result.conversation.title || 'Untitled Project',
				summary: result.summary || '',
				transcript: result.transcript?.text || textInput,
				actionItems: result.actionItems || [],
				topics: result.nodes || [],
				edges: result.edges || []
			};

			updateProject(project);
			currentProject.set(project);

			// Reset form
			audioFile = null;
			textInput = '';
		} catch (err: any) {
			console.error('Error processing text:', err);
			error = err.message || 'Failed to process text';
		} finally {
			isProcessing = false;
		}
	}

	function handleSubmit() {
		if (mode === 'audio') {
			processAudio();
		} else {
			processText();
		}
	}
</script>

<div class="card">
	<div class="card-header">
		<h2>Start a Project</h2>

		<!-- Mode toggle -->
		<div class="card-actions">
			<button
				class="mode-btn {mode === 'audio' ? 'active' : ''}"
				on:click={() => (mode = 'audio')}
			>
				🎙️ Audio
			</button>
			<button class="mode-btn {mode === 'text' ? 'active' : ''}" on:click={() => (mode = 'text')}>
				📝 Text
			</button>
		</div>
	</div>

	<div class="card-body">
		{#if mode === 'audio'}
			<!-- Audio upload -->
			<div class="upload-area">
				<input
					type="file"
					accept="audio/*"
					on:change={handleFileSelect}
					class="hidden"
					id="audio-upload"
				/>
				<label for="audio-upload" class="upload-label">
					<div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎤</div>
					{#if audioFile}
						<p style="font-size: var(--pm-text-sm); font-weight: 600; color: var(--pm-black);">
							{audioFile.name}
						</p>
						<p style="font-size: var(--pm-text-xs); color: var(--pm-brown); margin-top: 0.25rem;">
							{(audioFile.size / 1024 / 1024).toFixed(2)} MB
						</p>
					{:else}
						<p style="font-size: var(--pm-text-sm); font-weight: 600; color: var(--pm-black);">
							Click to upload audio
						</p>
						<p style="font-size: var(--pm-text-xs); color: var(--pm-brown); margin-top: 0.25rem;">
							MP3, WAV, WEBM, M4A (max 50MB)
						</p>
					{/if}
				</label>
			</div>
		{:else}
			<!-- Text input -->
			<textarea
				bind:value={textInput}
				placeholder="Paste your conversation, notes, or transcript here..."
				class="text-input"
			></textarea>
		{/if}

		{#if error}
			<div class="error-box">
				{error}
			</div>
		{/if}

		<button on:click={handleSubmit} disabled={isProcessing || (mode === 'audio' ? !audioFile : !textInput.trim())} class="btn btn-primary" style="margin-top: 1rem; width: 100%;">
			{#if isProcessing}
				<span class="inline-block animate-spin-slow" style="margin-right: 0.5rem;">⚙️</span>
				Processing with AI...
			{:else}
				Process {mode === 'audio' ? 'Audio' : 'Text'}
			{/if}
		</button>
	</div>
</div>

<style>
	.mode-btn {
		padding: 0.375rem 0.75rem;
		border-radius: var(--pm-radius-sm);
		font-size: var(--pm-text-sm);
		font-weight: 600;
		transition: all var(--pm-transition-fast);
		cursor: pointer;
		background: var(--pm-cream-dark);
		color: var(--pm-black);
		border: var(--pm-border-thin) solid rgba(30, 23, 20, 0.12);
	}

	.mode-btn:hover {
		background: var(--pm-cream-light);
		transform: translateY(-1px);
	}

	.mode-btn.active {
		background: var(--pm-pink);
		color: var(--pm-cream);
		border-color: var(--pm-pink);
	}

	.upload-area {
		border: var(--pm-border-medium) dashed rgba(30, 23, 20, 0.2);
		border-radius: var(--pm-radius-md);
		padding: 2rem;
		text-align: center;
		transition: all var(--pm-transition-medium);
		background: var(--pm-cream-dark);
	}

	.upload-area:hover {
		border-color: var(--pm-pink);
		background: var(--pm-cream-light);
	}

	.upload-label {
		cursor: pointer;
		display: block;
	}

	.text-input {
		width: 100%;
		height: 12rem;
		padding: 1rem;
		border: var(--pm-border-medium) solid rgba(30, 23, 20, 0.12);
		border-radius: var(--pm-radius-md);
		font-size: var(--pm-text-sm);
		color: var(--pm-black);
		background: var(--pm-cream-dark);
		resize: none;
		transition: all var(--pm-transition-fast);
		font-family: var(--pm-font-sans);
	}

	.text-input:focus {
		outline: none;
		border-color: var(--pm-pink);
		background: var(--pm-cream-light);
	}

	.text-input::placeholder {
		color: var(--pm-brown);
		opacity: 0.5;
	}

	.error-box {
		margin-top: 1rem;
		padding: 0.75rem;
		background: rgba(239, 68, 68, 0.1);
		border: var(--pm-border-medium) solid rgba(239, 68, 68, 0.3);
		border-radius: var(--pm-radius-sm);
		font-size: var(--pm-text-sm);
		color: #b91c1c;
	}
</style>
