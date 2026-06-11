import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { scopedClient } from "@/lib/supabase/scoped";

// Every database action starts here: turn the session cookie into an
// RLS-scoped Supabase client plus the current space id. No session → bounce
// to the landing (middleware already guards /o, this is belt-and-braces).
export async function requireSpace() {
  const session = await getSession();
  if (!session) redirect("/");
  return {
    supabase: scopedClient(session.token),
    spaceId: session.spaceId,
  };
}