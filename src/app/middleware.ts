import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySpaceToken } from "@/lib/auth/token";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;

  let authed = false;
  if (token) {
    try {
      await verifySpaceToken(token);
      authed = true;
    } catch {
      authed = false; // expired or tampered
    }
  }

  const { pathname } = req.nextUrl;
  const isProtected = pathname === "/o" || pathname.startsWith("/o/");
  const isLanding = pathname === "/";

  // Not logged in and reaching for a space → back to the landing.
  if (isProtected && !authed) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Already logged in → skip the landing, go straight into the space.
  if (isLanding && authed) {
    return NextResponse.redirect(new URL("/o", req.url));
  }

  return NextResponse.next();
}

// Only run middleware where it matters.
export const config = {
  matcher: ["/", "/o/:path*"],
};