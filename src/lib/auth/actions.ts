"use server";

import { redirect } from "next/navigation";
import { generateCode, normalizeCode } from "@/lib/auth/codes";
import { setSession, clearSession } from "@/lib/auth/session";
import { adminClient } from "@/lib/supabase/admin";

export async function createSpace(): Promise<{ code: string }> {
  const code = generateCode();
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("spaces")
    .insert({ code })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await setSession(data.id);
  return { code };
}

export async function joinSpace(
  rawCode: string
): Promise<{ error: string } | never> {
  const code = normalizeCode(rawCode);

  if (!code || code.length < 4) {
    return { error: "Koodi on liian lyhyt." };
  }

  const supabase = adminClient();
  const { data } = await supabase
    .from("spaces")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (!data) {
    return { error: "Koodia ei löydy. Tarkista kirjoitus." };
  }

  await setSession(data.id);
  redirect("/o");
}

export async function leaveSpace(): Promise<void> {
  await clearSession();
  redirect("/");
}