import { prisma } from "@/lib/prisma";
import { computeLifecycleStatus } from "@/lib/conferences/status";
import { mapConferenceForUi } from "@/lib/conferences/service";

const REGISTRABLE_STATUSES = new Set(["upcoming", "running"]);

/**
 * @param {any} conference - raw or mapped conference row
 */
export function getConferenceYear(conference) {
  if (conference.startDate) {
    return new Date(conference.startDate).getFullYear();
  }
  const days = conference.conferenceDays;
  if (Array.isArray(days) && days[0]?.date) {
    return new Date(`${days[0].date}T00:00:00`).getFullYear();
  }
  if (conference.year) return conference.year;
  return new Date().getFullYear();
}

/**
 * @param {any} conference
 */
export function isRegistrableConference(conference) {
  const status = conference.status ?? computeLifecycleStatus({
    cfpOpenAt: conference.cfpOpenAt,
    cfpCloseAt: conference.cfpCloseAt,
    registrationOpenAt: conference.registrationOpenAt,
    registrationCloseAt: conference.registrationCloseAt,
    conferenceDays: conference.conferenceDays,
  });
  return REGISTRABLE_STATUSES.has(status);
}

export async function getRegistrableConferences() {
  const rows = await prisma.conference.findMany({
    where: { publicationStatus: "PUBLISHED" },
    orderBy: [{ startDate: "asc" }, { title: "asc" }],
  });

  return rows
    .map((row) => {
      const mapped = mapConferenceForUi(row);
      return {
        id: mapped.id,
        slug: mapped.slug,
        title: mapped.title,
        status: mapped.status,
        year: getConferenceYear(mapped),
        dateRange: mapped.dateRange,
      };
    })
    .filter((c) => REGISTRABLE_STATUSES.has(c.status));
}
