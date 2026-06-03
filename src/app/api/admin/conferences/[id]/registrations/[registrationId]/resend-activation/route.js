import { NextResponse } from "next/server";
import { requireConferenceAccess } from "@/lib/auth/guards";
import { resendAccountActivation } from "@/lib/registration/service";

export async function POST(_request, { params }) {
  const { id, registrationId } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await resendAccountActivation({ registrationId, conferenceId: id });
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
