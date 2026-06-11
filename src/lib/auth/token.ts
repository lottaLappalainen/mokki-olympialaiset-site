import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// Cookie + lifetime. 3 days, as specified.
export const COOKIE_NAME = "olympialaiset_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 3; // 259200 seconds

// HS256 signing key. Use your project's JWT secret:
//   Supabase dashboard → Project Settings → API → JWT Settings → JWT Secret.
// (If your project has migrated to asymmetric JWT signing keys, sign with the
//  active private key instead and adjust the verify call accordingly.)
function getSecret(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface SpaceClaims extends JWTPayload {
  space_id: string;
  role: "authenticated";
}

// Mint a Supabase-compatible token scoped to one space.
// `role: authenticated` maps the request onto the `authenticated` Postgres role,
// and `space_id` is read by public.current_space_id() inside RLS policies.
export async function mintSpaceToken(spaceId: string): Promise<string> {
  return new SignJWT({ role: "authenticated", space_id: spaceId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(spaceId)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("3d")
    .sign(getSecret());
}

// Verify a token. Throws if invalid/expired. Edge-runtime safe (jose).
export async function verifySpaceToken(token: string): Promise<SpaceClaims> {
  const { payload } = await jwtVerify(token, getSecret(), {
    audience: "authenticated",
  });
  if (typeof payload.space_id !== "string") {
    throw new Error("Token missing space_id claim");
  }
  return payload as SpaceClaims;
}