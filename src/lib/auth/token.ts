import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const COOKIE_NAME = "olympialaiset_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 3; // 3 days

// The session token is now OURS — Supabase never sees or verifies it.
// Sign with any strong secret. Add SESSION_SECRET to .env.local:
//   openssl rand -base64 32
function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface SpaceClaims extends JWTPayload {
  space_id: string;
}

export async function mintSpaceToken(spaceId: string): Promise<string> {
  return new SignJWT({ space_id: spaceId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(spaceId)
    .setIssuedAt()
    .setExpirationTime("3d")
    .sign(getSecret());
}

export async function verifySpaceToken(token: string): Promise<SpaceClaims> {
  const { payload } = await jwtVerify(token, getSecret());
  if (typeof payload.space_id !== "string") {
    throw new Error("Token missing space_id claim");
  }
  return payload as SpaceClaims;
}