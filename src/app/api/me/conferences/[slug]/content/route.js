import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getPublishedConferenceBySlug } from "@/lib/conferences/service";
import { canAccessConferenceMemberContent } from "@/lib/auth/conference-member";
import {
  listConferencePresentations,
  listConferenceResources,
} from "@/lib/conference-content/service";
import { RESOURCE_TYPES } from "@/lib/conference-content/constants";

export async function GET(_request, { params }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const conference = await getPublishedConferenceBySlug(slug);
  if (!conference) {
    return NextResponse.json({ error: "Conference not found." }, { status: 404 });
  }

  const allowed = await canAccessConferenceMemberContent(session, conference.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [materials, paperTemplates, presentationTemplates, presentations] =
    await Promise.all([
      listConferenceResources(conference.id, RESOURCE_TYPES.MATERIAL),
      listConferenceResources(conference.id, RESOURCE_TYPES.PAPER_TEMPLATE),
      listConferenceResources(conference.id, RESOURCE_TYPES.PRESENTATION_TEMPLATE),
      listConferencePresentations(conference.id),
    ]);

  return NextResponse.json({
    materials,
    paperTemplates,
    presentationTemplates,
    presentations,
  });
}
