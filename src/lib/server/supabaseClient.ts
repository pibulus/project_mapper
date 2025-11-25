/**
 * Supabase Client - Server-Side
 *
 * Creates authenticated Supabase client for server-side operations
 * Uses service role key for admin access
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";

const SUPABASE_URL = publicEnv.PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL) {
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
  SUPABASE_URL || "https://placeholder.supabase.co",
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
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}
