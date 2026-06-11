"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { generateCode, normalizeCode } from "@/lib/auth/codes";

async function dbCreateSpace(code: string): Promise<void> {
  void code;
}

async function dbSpaceExists(code: string): Promise<boolean> {
  void code;
  return true;
}

export async function createSpace(): Promise<{ code: string }> {
  const code = generateCode();
  await dbCreateSpace(code);

  (await cookies()).set("pending_space_code", code, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 15,
    path: "/",
  });

  return { code };
}

export async function joinSpace(
  rawCode: string
): Promise<{ error: string } | never> {
  const code = normalizeCode(rawCode);

  if (!code || code.length < 4) {
    return { error: "Koodi on liian lyhyt." };
  }

  const exists = await dbSpaceExists(code);
  if (!exists) {
    return { error: "Koodia ei löydy. Tarkista kirjoitus." };
  }

  (await cookies()).set("space_code", code, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 3, // 3 days
    path: "/",
  });

  redirect("/o");
}

export async function leaveSpace(): Promise<void> {
  (await cookies()).delete("space_code");
  (await cookies()).delete("pending_space_code");
  redirect("/");
}