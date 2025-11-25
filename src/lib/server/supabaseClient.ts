/**
 * Supabase Client - Server-Side
 *
 * Creates authenticated Supabase client for server-side operations
 * Uses service role key for admin access
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/private";
import { PUBLIC_SUPABASE_URL } from "$env/static/public";

const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!PUBLIC_SUPABASE_URL) {
  console.warn("⚠️ PUBLIC_SUPABASE_URL not set");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "⚠️ SUPABASE_SERVICE_ROLE_KEY not set - database features disabled",
  );
}

/**
 * Server-side Supabase client with service role access
 * Use this for admin operations that bypass RLS
 */
export const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || "placeholder",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}
