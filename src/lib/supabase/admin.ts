import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS — now the ONLY data client, so every
// query must scope by space_id explicitly.
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase URL or service role key");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}