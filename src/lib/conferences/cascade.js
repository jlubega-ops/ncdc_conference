import { normalizeSpeaker } from "@/lib/conferences/utils";

/**
 * Removes programme items and speaker date assignments for dates no longer on the conference.
 * @param {{ conferenceDays: unknown[], programme: unknown[], speakers: unknown[] }} input
 */
export function cascadeConferenceScheduleData(input) {
  const validDates = new Set(
    (Array.isArray(input.conferenceDays) ? input.conferenceDays : [])
      .map((day) => day?.date)
      .filter(Boolean),
  );

  const programme = (Array.isArray(input.programme) ? input.programme : []).filter(
    (item) => item?.date && validDates.has(item.date),
  );

  const speakers = (Array.isArray(input.speakers) ? input.speakers : [])
    .map((item) => normalizeSpeaker(item))
    .filter(Boolean)
    .map((speaker) => {
      if (speaker.scheduleMode === "all") return speaker;
      const dates = (speaker.dates || []).filter((d) => validDates.has(d));
      if (dates.length === 0) return null;
      return { ...speaker, dates };
    })
    .filter(Boolean);

  return { programme, speakers };
}
