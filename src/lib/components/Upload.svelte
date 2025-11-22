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
	<div class="card-header flex items-center justify-between">
		<h2 class="text-lg font-bold">Start a Project</h2>

		<!-- Mode toggle -->
		<div class="flex gap-2">
			<button
				class="px-3 py-1 rounded-lg text-sm font-medium transition-all {mode === 'audio'
					? 'bg-pink-500 text-white'
					: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				on:click={() => (mode = 'audio')}
			>
				🎙️ Audio
			</button>
			<button
				class="px-3 py-1 rounded-lg text-sm font-medium transition-all {mode === 'text'
					? 'bg-purple-500 text-white'
					: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				on:click={() => (mode = 'text')}
			>
				📝 Text
			</button>
		</div>
	</div>

	<div class="card-body">
		{#if mode === 'audio'}
			<!-- Audio upload -->
			<div class="space-y-4">
				<div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-pink-400 transition-all">
					<input
						type="file"
						accept="audio/*"
						on:change={handleFileSelect}
						class="hidden"
						id="audio-upload"
					/>
					<label for="audio-upload" class="cursor-pointer">
						<div class="text-4xl mb-2">🎤</div>
						{#if audioFile}
							<p class="text-sm font-medium text-gray-900">{audioFile.name}</p>
							<p class="text-xs text-gray-500 mt-1">
								{(audioFile.size / 1024 / 1024).toFixed(2)} MB
							</p>
						{:else}
							<p class="text-sm font-medium text-gray-700">Click to upload audio</p>
							<p class="text-xs text-gray-500 mt-1">MP3, WAV, WEBM, M4A (max 50MB)</p>
						{/if}
					</label>
				</div>
			</div>
		{:else}
			<!-- Text input -->
			<div>
				<textarea
					bind:value={textInput}
					placeholder="Paste your conversation, notes, or transcript here..."
					class="w-full h-48 p-4 border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none resize-none"
				/>
			</div>
		{/if}

		{#if error}
			<div class="mt-4 p-3 bg-red-50 border-2 border-red-200 rounded-lg text-sm text-red-700">
				{error}
			</div>
		{/if}

		<button
			on:click={handleSubmit}
			disabled={isProcessing || (mode === 'audio' ? !audioFile : !textInput.trim())}
			class="mt-4 w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if isProcessing}
				<span class="inline-block animate-spin mr-2">⚙️</span>
				Processing with AI...
			{:else}
				Process {mode === 'audio' ? 'Audio' : 'Text'}
			{/if}
		</button>
	</div>
</div>
