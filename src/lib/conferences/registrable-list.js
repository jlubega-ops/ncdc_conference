import { getPublishedConferencesCached } from "@/lib/conferences/public-cache";
import { getConferenceYear, isRegistrableConference } from "@/lib/conferences/registrable";

/**
 * Published conferences currently open for public registration.
 * Uses the shared public catalogue cache so signup/search do not query MySQL on every request.
 */
export async function getRegistrableConferences() {
  const rows = await getPublishedConferencesCached();
  const now = new Date();

  return rows
    .map((mapped) => ({
      id: mapped.id,
      slug: mapped.slug,
      title: mapped.title,
      status: mapped.status,
      year: getConferenceYear(mapped),
      dateRange: mapped.dateRange,
      registrationOpenAt: mapped.registrationOpenAt,
      registrationCloseAt: mapped.registrationCloseAt,
      cfpOpenAt: mapped.cfpOpenAt,
      cfpCloseAt: mapped.cfpCloseAt,
    }))
    .filter((c) => isRegistrableConference(c, now));
}
