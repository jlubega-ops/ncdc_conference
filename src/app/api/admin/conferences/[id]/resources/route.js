import { NextResponse } from "next/server";
import { requireConferenceAccess } from "@/lib/auth/guards";
import {
  createConferenceResource,
  deleteConferenceResource,
  listConferenceResources,
} from "@/lib/conference-content/service";
import { RESOURCE_TYPES } from "@/lib/conference-content/constants";

export const runtime = "nodejs";

/**
 * @param {string} type
 */
function parseType(type) {
  const upper = String(type ?? "").toUpperCase();
  if (!Object.values(RESOURCE_TYPES).includes(upper)) return null;
  return upper;
}

export async function GET(request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = parseType(new URL(request.url).searchParams.get("type"));
  if (!type) {
    return NextResponse.json({ error: "Invalid resource type." }, { status: 400 });
  }

  const resources = await listConferenceResources(id, type);
  return NextResponse.json({ resources });
}

export async function POST(request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = parseType(new URL(request.url).searchParams.get("type"));
  if (!type) {
    return NextResponse.json({ error: "Invalid resource type." }, { status: 400 });
  }

  try {
    const form = await request.formData();
    const resource = await createConferenceResource(id, type, form);
    return NextResponse.json({ resource });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not add resource.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const session = await requireConferenceAccess(id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resourceId = new URL(request.url).searchParams.get("resourceId");
  if (!resourceId) {
    return NextResponse.json({ error: "resourceId is required." }, { status: 400 });
  }

  try {
    await deleteConferenceResource(id, resourceId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete resource.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
