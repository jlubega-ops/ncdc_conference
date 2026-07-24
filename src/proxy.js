import { NextResponse } from "next/server";

const SESSION_COOKIE = "ncdc_session";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Guest-only pages (/login, /access, /) are enforced in page loaders via
  // redirectIfAuthenticated — do not redirect here based on cookie alone.
  // A stale cookie after idle expiry would otherwise loop: /login → /dashboard → /login.

  if (pathname === "/dashboard") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard/")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
