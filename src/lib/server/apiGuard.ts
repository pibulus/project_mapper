import { env } from "$env/dynamic/private";
import { json, type RequestEvent } from "@sveltejs/kit";

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000;
const DEFAULT_RATE_LIMIT_MAX = 30;
const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const DEFAULT_AUDIO_MIME_TYPES = [
  "audio/aac",
  "audio/flac",
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/wave",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
];
const DEFAULT_AUDIO_EXTENSIONS = [
  ".aac",
  ".flac",
  ".m4a",
  ".mp3",
  ".mp4",
  ".ogg",
  ".wav",
  ".webm",
];

const RATE_LIMIT_WINDOW_MS = readPositiveNumber(
  env.API_RATE_WINDOW_MS,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
);
const RATE_LIMIT_MAX = readPositiveNumber(
  env.API_RATE_LIMIT,
  DEFAULT_RATE_LIMIT_MAX,
);
const MAX_UPLOAD_BYTES = readPositiveNumber(
  env.MAX_UPLOAD_BYTES,
  DEFAULT_MAX_UPLOAD_BYTES,
);
const AUTH_TOKEN = env.API_AUTH_TOKEN?.trim() || "";

const buckets = new Map<string, { count: number; windowStart: number }>();

function readPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getAllowedOrigins() {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getAllowedAudioMimeTypes() {
  const configuredTypes = (env.ALLOWED_AUDIO_MIME_TYPES ?? "")
    .split(",")
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean);

  return configuredTypes.length ? configuredTypes : DEFAULT_AUDIO_MIME_TYPES;
}

function isOriginAllowed(event: RequestEvent) {
  const { request, url } = event;
  const allowedOrigins = getAllowedOrigins();
  const origin = request.headers.get("origin");
  if (!origin) return true;

  if (origin === url.origin) return true;
  return allowedOrigins.includes(origin);
}

function getClientKey(event: RequestEvent) {
  try {
    const address = event.getClientAddress();
    if (address) return address;
  } catch {
    // Ignore platform-specific address lookup failures.
  }

  const forwarded = event.request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return event.request.headers.get("cf-connecting-ip") ?? "unknown";
}

function clearExpired(now: number) {
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      buckets.delete(key);
    }
  }
}

function enforceRateLimit(event: RequestEvent) {
  if (RATE_LIMIT_MAX <= 0 || RATE_LIMIT_WINDOW_MS <= 0) {
    return null;
  }

  const now = Date.now();
  clearExpired(now);

  const key = getClientKey(event);
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return null;
  }

  existing.count += 1;
  buckets.set(key, existing);

  if (existing.count > RATE_LIMIT_MAX) {
    return json(
      {
        error: "Too many requests. Slow down a little.",
        retry_after_ms: RATE_LIMIT_WINDOW_MS - (now - existing.windowStart),
      },
      { status: 429 },
    );
  }

  return null;
}

export function getMaxUploadBytes() {
  return MAX_UPLOAD_BYTES;
}

export function isAllowedAudioUpload(file: File) {
  const allowedTypes = getAllowedAudioMimeTypes();
  const mimeType = file.type.toLowerCase().split(";")[0]?.trim() || "";

  if (mimeType) {
    return allowedTypes.some((allowedType) => {
      if (allowedType.endsWith("/*")) {
        return mimeType.startsWith(`${allowedType.slice(0, -1)}`);
      }
      return mimeType === allowedType;
    });
  }

  const filename = file.name.toLowerCase();
  return DEFAULT_AUDIO_EXTENSIONS.some((extension) =>
    filename.endsWith(extension),
  );
}

export function getAllowedAudioDescription() {
  return getAllowedAudioMimeTypes().join(", ");
}

export function guardRequest(event: RequestEvent) {
  if (AUTH_TOKEN) {
    const bearer = event.request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");
    const fallback = event.request.headers.get("x-api-token")?.trim();
    const suppliedToken = bearer?.trim() || fallback || "";

    if (!suppliedToken || suppliedToken !== AUTH_TOKEN) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isOriginAllowed(event)) {
    return json({ error: "Request origin is not allowed" }, { status: 403 });
  }

  return enforceRateLimit(event);
}
