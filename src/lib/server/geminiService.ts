/**
 * Gemini Service - SvelteKit Server-Side
 *
 * Clean wrapper around the official Google Generative AI SDK
 * Pattern inspired by TalkType's implementation
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import fs from "node:fs";
import path from "node:path";
import { createGeminiService, type AIService } from "$lib/core/ai/gemini";

const localDevEnv = dev ? readLocalGeminiEnv() : {};

if (
  dev &&
  localDevEnv.GEMINI_API_KEY &&
  env.GEMINI_API_KEY &&
  localDevEnv.GEMINI_API_KEY !== env.GEMINI_API_KEY
) {
  console.warn(
    "[Gemini] Using local .env GEMINI_API_KEY over inherited shell value in dev",
  );
}

const GEMINI_API_KEY = getPrivateEnv("GEMINI_API_KEY");
const GEMINI_MODEL = getPrivateEnv("GEMINI_MODEL") || "gemini-3.1-flash-lite";
const GEMINI_FALLBACK_MODELS =
  getPrivateEnv("GEMINI_FALLBACK_MODELS") ||
  "gemini-2.5-flash-lite,gemini-2.5-flash";

if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY not set - AI features will not work");
}

let cachedModel: any = null;
let cachedService: AIService | null = null;

function getPrivateEnv(key: string) {
  return localDevEnv[key] || env[key];
}

function readLocalGeminiEnv(): Record<string, string> {
  const values: Record<string, string> = {};
  const cwd = process.cwd();
  const files = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
  ];

  for (const file of files) {
    const filePath = path.join(cwd, file);
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = line
        .slice(0, separatorIndex)
        .trim()
        .replace(/^export\s+/, "");

      if (!key.startsWith("GEMINI_")) continue;

      values[key] = parseEnvValue(line.slice(separatorIndex + 1));
    }
  }

  return values;
}

function parseEnvValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed.replace(/\s+#.*$/, "");
}

function getModelNames(): string[] {
  return [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS.split(",")]
    .map((model) => model.trim())
    .filter(Boolean)
    .filter((model, index, models) => models.indexOf(model) === index);
}

function isRetriableGeminiError(error: any) {
  const status = Number(error?.status || 0);
  const message = String(error?.message || "").toLowerCase();
  return (
    [429, 500, 502, 503, 504].includes(status) ||
    message.includes("high demand") ||
    message.includes("service unavailable") ||
    message.includes("temporarily unavailable")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function prepareInputForModel(input: any, modelName: string) {
  if (!isRecord(input) || !isRecord(input.generationConfig)) {
    return input;
  }

  const thinkingConfig = input.generationConfig.thinkingConfig;
  if (!isRecord(thinkingConfig) || !("thinkingLevel" in thinkingConfig)) {
    return input;
  }

  if (!modelName.startsWith("gemini-2.5")) {
    return input;
  }

  const { thinkingLevel, ...remainingThinkingConfig } = thinkingConfig;
  const thinkingBudget = thinkingLevel === "minimal" ? 0 : -1;

  return {
    ...input,
    generationConfig: {
      ...input.generationConfig,
      thinkingConfig: {
        ...remainingThinkingConfig,
        thinkingBudget,
      },
    },
  };
}

/**
 * Get Gemini model instance (cached)
 */
export function getGeminiModel() {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  if (!cachedModel) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const modelNames = getModelNames();
    const modelCache = new Map<string, any>();

    const getRawModel = (modelName: string) => {
      if (!modelCache.has(modelName)) {
        modelCache.set(
          modelName,
          genAI.getGenerativeModel({ model: modelName }),
        );
      }
      return modelCache.get(modelName);
    };

    cachedModel = {
      async generateContent(input: any) {
        let lastError: unknown;
        for (const [index, modelName] of modelNames.entries()) {
          try {
            if (index > 0) {
              console.warn(
                `[Gemini] Retrying with fallback model: ${modelName}`,
              );
            }
            return await getRawModel(modelName).generateContent(
              prepareInputForModel(input, modelName),
            );
          } catch (error) {
            lastError = error;
            if (
              !isRetriableGeminiError(error) ||
              index === modelNames.length - 1
            ) {
              throw error;
            }
            console.warn(
              `[Gemini] Model ${modelName} unavailable, trying fallback`,
            );
          }
        }
        throw lastError;
      },
    };
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
  }

  return cachedService;
}

/**
 * Transcribe audio file directly using Gemini SDK
 *
 * Simplified pattern from talktype - uploads file, transcribes, cleans up
 * Much simpler than manual HTTP multipart uploads!
 */
export async function transcribeAudio(
  file: File,
): Promise<{ text: string; speakers: string[] }> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const mimeType = file.type || "audio/webm";
  const arrayBuffer = await file.arrayBuffer();
  const audioPart = {
    inlineData: {
      data: Buffer.from(arrayBuffer).toString("base64"),
      mimeType,
    },
  };

  const aiService = getAIService();
  return aiService.transcribeAudio(audioPart);
}
