import { prisma } from "@/lib/prisma";
import { getManagedConferenceIds } from "@/lib/auth/conference-access";
import { mapConferenceForUi } from "@/lib/conferences/service";

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 */
export function canAccessReports(session) {
  if (!session) return false;
  return ["SUPERADMIN", "CONFERENCE_ADMIN", "REVIEWER"].includes(session.activeRole);
}

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 */
export async function getReportConferenceOptions(session) {
  if (!session) return [];

  if (session.activeRole === "SUPERADMIN") {
    const rows = await prisma.conference.findMany({
      orderBy: { title: "asc" },
      select: { id: true, slug: true, title: true, publicationStatus: true },
    });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      published: r.publicationStatus === "PUBLISHED",
    }));
  }

  if (session.activeRole === "CONFERENCE_ADMIN") {
    const managedIds = getManagedConferenceIds(session);
    if (!managedIds?.length) return [];
    const rows = await prisma.conference.findMany({
      where: { id: { in: managedIds } },
      orderBy: { title: "asc" },
    });
    return rows.map((r) => {
      const mapped = mapConferenceForUi(r);
      return { id: mapped.id, slug: mapped.slug, title: mapped.title, published: true };
    });
  }

  if (session.activeRole === "REVIEWER") {
    const assigned = await prisma.paperSubmission.findMany({
      where: { assignedReviewerId: session.user.id },
      select: { conferenceId: true },
      distinct: ["conferenceId"],
    });
    const roleConfs = session.roles
      .filter((r) => r.role === "REVIEWER" && r.conferenceId)
      .map((r) => r.conferenceId);

    const ids = [...new Set([...assigned.map((a) => a.conferenceId), ...roleConfs])];
    if (!ids.length) return [];

    const rows = await prisma.conference.findMany({
      where: { id: { in: ids } },
      orderBy: { title: "asc" },
    });
    return rows.map((r) => {
      const mapped = mapConferenceForUi(r);
      return { id: mapped.id, slug: mapped.slug, title: mapped.title, published: true };
    });
  }

  return [];
}

/**
 * @param {Awaited<ReturnType<import("@/lib/auth/session").getCurrentSession>>} session
 * @param {string | null} conferenceId
 */
export async function resolveReportConferenceIds(session, conferenceId) {
  const options = await getReportConferenceOptions(session);
  const allowedIds = new Set(options.map((c) => c.id));

  if (!allowedIds.size) return { ids: [], options };

  if (conferenceId && conferenceId !== "all" && allowedIds.has(conferenceId)) {
    return { ids: [conferenceId], options };
  }

  if (session.activeRole === "REVIEWER" && conferenceId === "all") {
    return { ids: [...allowedIds], options };
  }

  if (conferenceId === "all" || !conferenceId) {
    return { ids: [...allowedIds], options };
  }

  return { ids: options.length === 1 ? [options[0].id] : [...allowedIds], options };
}
