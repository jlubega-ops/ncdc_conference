import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canAccessConferenceMemberContent } from "@/lib/auth/conference-member";
import { getMemberContentCatalogCached } from "@/lib/conferences/public-cache";
import { jsonNoStore } from "@/lib/http/no-store";

export async function GET(_request, { params }) {
  const session = await requireSession();
  if (!session) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const conference = await prisma.conference.findFirst({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (!conference) {
    return jsonNoStore({ error: "Conference not found." }, { status: 404 });
  }

  const allowed = await canAccessConferenceMemberContent(session, conference.id);
  if (!allowed) {
    return jsonNoStore({ error: "Forbidden" }, { status: 403 });
  }

  const catalog = await getMemberContentCatalogCached(conference.id);
  return jsonNoStore({
    materials: catalog.materials,
    paperTemplates: catalog.paperTemplates,
    presentationTemplates: catalog.presentationTemplates,
    presentations: catalog.presentations,
  });
}
