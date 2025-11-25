/**
 * Supabase Client - Client-Side
 *
 * Creates public Supabase client for client-side operations
 * Uses anon key with Row Level Security (RLS)
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/public";

// Use dynamic imports to allow missing env vars
const SUPABASE_URL = env.PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL) {
  console.warn("⚠️ PUBLIC_SUPABASE_URL not set");
}

if (!SUPABASE_ANON_KEY) {
  console.warn(
    "⚠️ PUBLIC_SUPABASE_ANON_KEY not set - database features disabled",
  );
}

/**
 * Client-side Supabase client with anon key
 * Respects Row Level Security policies
 */
export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder",
);

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
