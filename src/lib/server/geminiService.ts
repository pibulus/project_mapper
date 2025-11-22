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
const GEMINI_MODEL = env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

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
 * Upload audio file to Gemini and get file reference
 *
 * This is used for the official SDK's file-based upload pattern
 * (cleaner than manual base64 encoding for large files)
 */
export async function uploadAudioFile(file: File): Promise<{ uri: string; mimeType: string }> {
	if (!GEMINI_API_KEY) {
		throw new Error('GEMINI_API_KEY not configured');
	}

	const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

	const uploadResult = await genAI.files.upload({
		file,
		config: {
			mimeType: file.type || 'audio/webm',
			displayName: file.name || `recording-${Date.now()}`
		}
	});

	if (!uploadResult?.uri) {
		throw new Error('File upload to Gemini failed');
	}

	console.log(`[Gemini] Uploaded audio file: ${uploadResult.uri}`);

	return {
		uri: uploadResult.uri,
		mimeType: uploadResult.mimeType || file.type || 'audio/webm'
	};
}
