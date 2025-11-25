/**
 * Gemini Service - SvelteKit Server-Side
 *
 * Clean wrapper around the official Google Generative AI SDK
 * Pattern inspired by TalkType's implementation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';
import { createGeminiService, type AIService } from '$lib/core/ai/gemini';

const GEMINI_API_KEY = env.GEMINI_API_KEY;
const GEMINI_MODEL = env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

if (!GEMINI_API_KEY) {
	console.warn('⚠️ GEMINI_API_KEY not set - AI features will not work');
}

let cachedModel: any = null;
let cachedService: AIService | null = null;

/**
 * Get Gemini model instance (cached)
 */
export function getGeminiModel() {
	if (!GEMINI_API_KEY) {
		throw new Error('GEMINI_API_KEY not configured');
	}

	if (!cachedModel) {
		const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
		cachedModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
		console.log(`[Gemini] Initialized model: ${GEMINI_MODEL}`);
	}

	return cachedModel;
}

/**
 * Get AI Service instance (cached)
 *
 * This wraps the model with the core AI service interface
 * which provides all the conversation processing methods
 */
export function getAIService(): AIService {
	if (!cachedService) {
		const model = getGeminiModel();
		cachedService = createGeminiService(model);
		console.log('[Gemini] AI Service initialized');
	}

	return cachedService;
}

/**
 * Transcribe audio file directly using Gemini SDK
 *
 * Simplified pattern from talktype - uploads file, transcribes, cleans up
 * Much simpler than manual HTTP multipart uploads!
 */
export async function transcribeAudio(file: File): Promise<{ text: string; speakers: string[] }> {
	if (!GEMINI_API_KEY) {
		throw new Error('GEMINI_API_KEY not configured');
	}

	const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
	const mimeType = file.type || 'audio/webm';
	const displayName = file.name || `recording-${Date.now()}`;
	let uploadedFileName: string | null = null;

	try {
		// Upload audio file to Gemini
		const uploadResult = await genAI.files.upload({
			file,
			config: { mimeType, displayName }
		});

		if (!uploadResult?.uri) {
			throw new Error('File upload to Gemini failed');
		}

		uploadedFileName = uploadResult?.name ?? null;
		console.log('[Gemini] Uploaded audio file');

		// Get AI service and transcribe
		const aiService = getAIService();
		const audioPart = {
			fileData: {
				fileUri: uploadResult.uri,
				mimeType: uploadResult.mimeType || mimeType
			}
		};

		const result = await aiService.transcribeAudio(audioPart);
		console.log('[Gemini] ✅ Transcription complete');

		return result;
	} finally {
		// Clean up uploaded file
		if (uploadedFileName) {
			try {
				await genAI.files.delete(uploadedFileName);
			} catch (cleanupError) {
				console.warn('⚠️ Failed to delete Gemini file:', cleanupError);
			}
		}
	}
}
