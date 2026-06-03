import { NextResponse } from "next/server";
import { getSessionRecord, switchActiveRole } from "@/lib/auth/session";
import { ROLE_HIERARCHY } from "@/lib/auth/roles";

export async function POST(request) {
  try {
    const record = await getSessionRecord();
    if (!record) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { role } = await request.json();
    if (!role || !ROLE_HIERARCHY.includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const session = await switchActiveRole(record.userId, role);
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Switch failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
