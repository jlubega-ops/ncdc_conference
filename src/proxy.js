import { NextResponse } from "next/server";

const SESSION_COOKIE = "ncdc_session";

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname === "/dashboard") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard/")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
