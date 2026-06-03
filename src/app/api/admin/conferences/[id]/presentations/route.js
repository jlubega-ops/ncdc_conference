import { NextResponse } from "next/server";
import { requireConferenceAccess } from "@/lib/auth/guards";
import {
  createConferencePresentation,
  deleteConferencePresentation,
  listConferencePresentations,
} from "@/lib/conference-content/service";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const presentations = await listConferencePresentations(id);
  return NextResponse.json({ presentations });
}

export async function POST(request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const presentation = await createConferencePresentation(id, form);
    return NextResponse.json({ presentation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not add presentation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const presentationId = new URL(request.url).searchParams.get("presentationId");
  if (!presentationId) {
    return NextResponse.json({ error: "presentationId is required." }, { status: 400 });
  }

  try {
    await deleteConferencePresentation(id, presentationId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete presentation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
