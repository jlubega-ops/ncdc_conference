import { formatProgrammeDayLabel } from "@/lib/conferences/utils";
import { normalizeConferenceDays } from "@/lib/attendance/utils";

/**
 * @param {string | null | undefined} dateStr
 * @param {number | null | undefined} dayIndex
 */
export function formatPresentationDayLabel(dateStr, dayIndex) {
  const date = String(dateStr || "").slice(0, 10);
  if (!date) return "Unassigned";
  const pretty = formatProgrammeDayLabel(date) || date;
  if (dayIndex && dayIndex > 0) {
    return `Day ${dayIndex} — ${pretty}`;
  }
  return pretty;
}

/**
 * @param {string | null | undefined} name
 * @param {string | null | undefined} title
 */
export function formatPresentationSpeaker(name, title) {
  const n = String(name || "").trim();
  const t = String(title || "").trim();
  if (!n) return "";
  return t ? `${n} · ${t}` : n;
}

/**
 * Group presentations by conference day (sessionLabel stores YYYY-MM-DD).
 * Legacy free-text labels are kept in their own groups at the end.
 *
 * @param {Array<{
 *   sessionLabel?: string | null;
 *   dayIndex?: number | null;
 *   dayLabel?: string | null;
 *   title?: string;
 *   speakerName?: string | null;
 * }>} presentations
 * @param {Array<{ date: string; dayIndex: number }>} [conferenceDays]
 * @returns {Array<[string, any[]]>}
 */
export function groupPresentationsByDay(presentations, conferenceDays = []) {
  const days = normalizeConferenceDays(conferenceDays);
  const dayByDate = new Map(days.map((d) => [d.date, d]));

  /** @type {Map<string, { sort: number; label: string; items: any[] }>} */
  const groups = new Map();

  for (const p of presentations || []) {
    const raw = String(p.sessionLabel || "").trim();
    const known = dayByDate.get(raw);
    let key;
    let sort;
    let label;

    if (known) {
      key = known.date;
      sort = known.dayIndex;
      label = p.dayLabel || formatPresentationDayLabel(known.date, known.dayIndex);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      key = raw;
      sort = 9000 + Number(raw.replace(/-/g, ""));
      label = p.dayLabel || formatPresentationDayLabel(raw, null);
    } else if (raw) {
      key = `legacy:${raw}`;
      sort = 9500;
      label = raw;
    } else {
      key = "__unassigned__";
      sort = 9999;
      label = "Unassigned";
    }

    if (!groups.has(key)) {
      groups.set(key, { sort, label, items: [] });
    }
    groups.get(key).items.push(p);
  }

  return [...groups.values()]
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label))
    .map((g) => /** @type {[string, any[]]} */ ([g.label, g.items]));
}
