import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/guards";
import { resendUserActivation } from "@/lib/users/service";

export async function POST(_request, { params }) {
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await resendUserActivation(id);
    return NextResponse.json({
      ok: true,
      message: "Activation email sent with a new temporary password.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resend activation.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
