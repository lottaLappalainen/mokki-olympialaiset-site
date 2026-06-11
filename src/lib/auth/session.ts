import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  SESSION_MAX_AGE,
  mintSpaceToken,
  verifySpaceToken,
} from "./token";

// Mint a token for the space and store it as an httpOnly cookie (3 days).
export async function setSession(spaceId: string): Promise<void> {
  const token = await mintSpaceToken(spaceId);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

// Read + verify the current session. Returns the space id and the raw token
// (the token is needed to build the RLS-scoped Supabase client). null if absent
// or invalid/expired.
export async function getSession(): Promise<{
  spaceId: string;
  token: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const claims = await verifySpaceToken(token);
    return { spaceId: claims.space_id, token };
  } catch {
    return null;
  }
}

// Clear the session (leave the space).
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}