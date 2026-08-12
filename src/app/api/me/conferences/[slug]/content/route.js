import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
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
  const conference = await prisma.conference.findFirst({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (!conference) {
    return NextResponse.json({ error: "Conference not found." }, { status: 404 });
  }

  const allowed = await canAccessConferenceMemberContent(session, conference.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const listOpts = { includeFileAccess: false };
  const [materials, paperTemplates, presentationTemplates, presentations] =
    await Promise.all([
      listConferenceResources(conference.id, RESOURCE_TYPES.MATERIAL, listOpts),
      listConferenceResources(conference.id, RESOURCE_TYPES.PAPER_TEMPLATE, listOpts),
      listConferenceResources(conference.id, RESOURCE_TYPES.PRESENTATION_TEMPLATE, listOpts),
      listConferencePresentations(conference.id, listOpts),
    ]);

  return NextResponse.json({
    materials,
    paperTemplates,
    presentationTemplates,
    presentations,
  });
}
