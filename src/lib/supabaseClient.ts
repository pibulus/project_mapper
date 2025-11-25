/**
 * Supabase Client - Client-Side
 *
 * Creates public Supabase client for client-side operations
 * Uses anon key with Row Level Security (RLS)
 */

import { createClient } from "@supabase/supabase-js";
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from "$env/static/public";

if (!PUBLIC_SUPABASE_URL) {
  console.warn("⚠️ PUBLIC_SUPABASE_URL not set");
}

if (!PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    "⚠️ PUBLIC_SUPABASE_ANON_KEY not set - database features disabled",
  );
}

/**
 * Client-side Supabase client with anon key
 * Respects Row Level Security policies
 */
export const supabase = createClient(
  PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  PUBLIC_SUPABASE_ANON_KEY || "placeholder",
);

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY);
}
