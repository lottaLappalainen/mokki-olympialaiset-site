import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { adminClient } from "@/lib/supabase/admin";

// IMPORTANT: this client bypasses RLS. Every query you run with it MUST
// include .eq("space_id", spaceId) on reads, and set space_id on writes.
export async function requireSpace() {
  const session = await getSession();
  if (!session) redirect("/");
  return { supabase: adminClient(), spaceId: session.spaceId };
}