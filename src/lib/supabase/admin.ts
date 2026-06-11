import { createClient } from "@supabase/supabase-js";

// RLS-SCOPED client. Built per-request with the session JWT as the bearer
// token, so every query runs as the `authenticated` role carrying the
// `space_id` claim. RLS automatically limits results to that one space.
// Use this for all normal reads/writes (pass it `session.token`).
export function scopedClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing Supabase URL or anon key");
  }
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}