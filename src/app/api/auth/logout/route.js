import { NextResponse } from "next/server";
import { clearSessionCookie, destroySession } from "@/lib/auth/session";

export async function POST() {
  await destroySession();
  const response = NextResponse.json({ ok: true, redirect: "/" });
  await clearSessionCookie(response);
  return response;
}
