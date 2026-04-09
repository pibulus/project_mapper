import { env } from "$env/dynamic/private";
import { json, type RequestEvent } from "@sveltejs/kit";

const RATE_LIMIT_WINDOW_MS = Number(env.API_RATE_WINDOW_MS ?? "60000");
const RATE_LIMIT_MAX = Number(env.API_RATE_LIMIT ?? "30");
const MAX_UPLOAD_BYTES = Number(env.MAX_UPLOAD_BYTES ?? `${50 * 1024 * 1024}`);
const AUTH_TOKEN = env.API_AUTH_TOKEN?.trim() || "";

const buckets = new Map<string, { count: number; windowStart: number }>();

function getAllowedOrigins() {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isOriginAllowed(request: Request) {
  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.length) return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;

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

  if (!isOriginAllowed(event.request)) {
    return json({ error: "Request origin is not allowed" }, { status: 403 });
  }

  return enforceRateLimit(event);
}
