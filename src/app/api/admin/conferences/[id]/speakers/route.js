import { NextResponse } from "next/server";
import { requireConferenceAccess } from "@/lib/auth/guards";
import {
  getConferenceSpeakers,
  updateConferenceSpeakers,
} from "@/lib/conference-content/service";

export async function GET(_request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const speakers = await getConferenceSpeakers(id);
  return NextResponse.json({ speakers });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const speakers = await updateConferenceSpeakers(id, body.speakers);
    return NextResponse.json({ speakers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update speakers.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
