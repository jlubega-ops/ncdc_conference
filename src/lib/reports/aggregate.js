import { GENDER_OPTIONS, AGE_RANGES, ATTENDANCE_MODES } from "@/lib/registration/constants";
import { PAPER_STATUS_LABELS } from "@/lib/papers/constants";
import { REGISTRATION_MODE_LABELS } from "@/lib/conferences/constants";
import { normalizeOnlineStream, normalizeBreakoutRooms } from "@/lib/conferences/utils";
import {
  GIFT_CATEGORIES,
  countIssuedGiftProgress,
  normalizeGiftsSettings,
} from "@/lib/gifts/settings";

const GENDER_LABELS = Object.fromEntries(GENDER_OPTIONS.map((g) => [g.value, g.label]));
const MODE_LABELS = Object.fromEntries(ATTENDANCE_MODES.map((m) => [m.value, m.label]));
const GIFT_CATEGORY_LABELS = Object.fromEntries(
  GIFT_CATEGORIES.map((c) => [c.value, c.label]),
);

const REG_STATUS_LABELS = {
  PENDING: "Pending",
  NEEDS_REVISION: "Needs revision",
  CONFIRMED: "Approved",
  CANCELLED: "Cancelled",
};

/**
 * @param {Array<{ formData?: unknown }>} rows
 * @param {string} field
 */
function countFormField(rows, field) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const row of rows) {
    const form = row.formData && typeof row.formData === "object" ? row.formData : {};
    const val = form[field];
    if (!val) continue;
    if (Array.isArray(val)) {
      for (const item of val) {
        counts[item] = (counts[item] ?? 0) + 1;
      }
    } else {
      const key = String(val);
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * @param {Array<{ registeredAt: Date | string }>} rows
 * @param {number} periodDays 0 = all
 */
export function buildRegistrationTrend(rows, periodDays = 0) {
  const cutoff =
    periodDays > 0
      ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
      : null;

  /** @type {Record<string, number>} */
  const byDay = {};
  for (const row of rows) {
    const d = new Date(row.registeredAt);
    if (cutoff && d < cutoff) continue;
    const key = d.toISOString().slice(0, 10);
    byDay[key] = (byDay[key] ?? 0) + 1;
  }

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, label: date, value }));
}

/**
 * @param {Array<any>} registrations
 * @param {{ statusFilter?: string }} [opts]
 */
export function aggregateRegistrations(registrations, opts = {}) {
  let rows = registrations;
  if (opts.statusFilter && opts.statusFilter !== "all") {
    rows = rows.filter((r) => r.status === opts.statusFilter);
  }

  const byStatus = {};
  for (const r of registrations) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }

  const genderCounts = countFormField(rows, "gender");
  const ageCounts = countFormField(rows, "ageRange");
  const modeCounts = countFormField(rows, "attendanceMode");
  const countryCounts = countFormField(rows, "countryOfOrigin");
  const institutionCounts = countFormField(rows, "institution");
  const subThemeCounts = countFormField(rows, "subThemes");

  const paymentCounts = {};
  for (const r of rows) {
    const key = r.paymentStatus || "none";
    paymentCounts[key] = (paymentCounts[key] ?? 0) + 1;
  }

  return {
    total: registrations.length,
    filteredTotal: rows.length,
    byStatus: Object.entries(byStatus).map(([key, value]) => ({
      key,
      label: REG_STATUS_LABELS[key] ?? key,
      value,
    })),
    byGender: Object.entries(genderCounts).map(([key, value]) => ({
      key,
      label: GENDER_LABELS[key] ?? key,
      value,
    })),
    byAge: AGE_RANGES.map((a) => ({
      key: a.value,
      label: a.label,
      value: ageCounts[a.value] ?? 0,
    })).filter((x) => x.value > 0),
    byMode: Object.entries(modeCounts).map(([key, value]) => ({
      key,
      label: MODE_LABELS[key] ?? key,
      value,
    })),
    byCountry: Object.entries(countryCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    topInstitutions: Object.entries(institutionCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    subThemes: Object.entries(subThemeCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    paymentStatus: Object.entries(paymentCounts).map(([key, value]) => ({
      key,
      label: key === "none" ? "Not required" : key.replace(/_/g, " "),
      value,
    })),
    trend: buildRegistrationTrend(rows),
  };
}

/**
 * @param {Array<{ status: string; isFinalApproved?: boolean }>} papers
 */
export function aggregatePapers(papers) {
  const byStatus = {};
  for (const p of papers) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  return {
    total: papers.length,
    finalApproved: papers.filter((p) => p.isFinalApproved).length,
    byStatus: Object.entries(byStatus).map(([key, value]) => ({
      key,
      label: PAPER_STATUS_LABELS[key] ?? key,
      value,
    })),
    trend: buildRegistrationTrend(
      papers.filter((p) => p.submittedAt).map((p) => ({ registeredAt: p.submittedAt })),
    ),
  };
}

/**
 * @param {Array<{ rating: number | null; feedbackType?: string }>} feedback
 */
export function aggregateFeedback(feedback) {
  const ratings = feedback.filter((f) => f.rating != null).map((f) => f.rating);
  const avg = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;

  /** @type {Record<number, number>} */
  const byRating = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) {
    if (r >= 1 && r <= 5) byRating[r] = (byRating[r] ?? 0) + 1;
  }

  let day = 0;
  let speaker = 0;
  for (const row of feedback) {
    if (row.feedbackType === "SPEAKER") speaker += 1;
    else day += 1;
  }

  return {
    total: feedback.length,
    avgRating: avg,
    withRating: ratings.length,
    byRating: [5, 4, 3, 2, 1].map((n) => ({
      label: `${n} star${n > 1 ? "s" : ""}`,
      value: byRating[n] ?? 0,
    })),
    byType: [
      { key: "DAY", label: "Day evaluations", value: day },
      { key: "SPEAKER", label: "Speaker evaluations", value: speaker },
    ].filter((row) => row.value > 0),
  };
}

/**
 * @param {Array<{ registrationMode?: string | null }>} conferences
 */
export function aggregateRegistrationModes(conferences) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const conf of conferences) {
    const mode = conf.registrationMode || "MANUAL_APPROVE";
    counts[mode] = (counts[mode] ?? 0) + 1;
  }
  return Object.entries(counts).map(([key, value]) => ({
    key,
    label: REGISTRATION_MODE_LABELS[key] ?? key,
    value,
  }));
}

/**
 * @param {Array<{ dayDate?: string }>} marks
 */
export function aggregateAttendanceByDay(marks) {
  /** @type {Record<string, number>} */
  const byDay = {};
  for (const mark of marks) {
    const key = String(mark.dayDate || "").trim();
    if (!key) continue;
    byDay[key] = (byDay[key] ?? 0) + 1;
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      label: date,
      value,
    }));
}

/**
 * @param {Array<{ emailedAt?: Date | string | null }>} certificates
 */
export function aggregateCertificates(certificates) {
  const issued = certificates.length;
  const emailed = certificates.filter((c) => Boolean(c.emailedAt)).length;
  return {
    issued,
    emailed,
    pendingEmail: Math.max(0, issued - emailed),
  };
}

/**
 * Lightweight gifts roll-up across conferences in scope.
 * @param {Array<{ id: string; giftsSettings?: unknown }>} conferences
 * @param {Array<{ conferenceId: string; category: string; items?: unknown }>} issuances
 */
export function aggregateGifts(conferences, issuances) {
  /** @type {Map<string, ReturnType<typeof normalizeGiftsSettings>>} */
  const settingsByConference = new Map();
  /** @type {Map<string, { id: string; name: string; stock: number; count: number }>} */
  const itemTotals = new Map();

  for (const conf of conferences) {
    const settings = normalizeGiftsSettings(conf.giftsSettings);
    if (!settings.applicable) continue;
    settingsByConference.set(conf.id, settings);
    for (const item of settings.items) {
      const existing = itemTotals.get(item.id);
      const stock = Math.max(0, Number(item.stock) || 0);
      if (existing) {
        existing.stock += stock;
      } else {
        itemTotals.set(item.id, {
          id: item.id,
          name: item.name,
          stock,
          count: 0,
        });
      }
    }
  }

  let fullyIssued = 0;
  let partiallyIssued = 0;
  /** @type {Record<string, number>} */
  const byCategory = {};

  for (const row of issuances) {
    const settings = settingsByConference.get(row.conferenceId);
    if (!settings) continue;
    const issuedItems =
      row.items && typeof row.items === "object" && !Array.isArray(row.items)
        ? row.items
        : {};
    const progress = countIssuedGiftProgress(issuedItems, settings.items);
    if (progress.total > 0 && progress.got >= progress.total) fullyIssued += 1;
    else if (progress.got > 0) partiallyIssued += 1;

    byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;

    for (const [itemId, qty] of Object.entries(issuedItems)) {
      const n = Math.max(0, Math.round(Number(qty) || 0));
      if (!n) continue;
      const bucket = itemTotals.get(itemId);
      if (bucket) bucket.count += n;
    }
  }

  const itemCounts = [...itemTotals.values()]
    .map((item) => ({
      id: item.id,
      name: item.name,
      count: item.count,
      stock: item.stock,
      remaining: item.stock > 0 ? Math.max(0, item.stock - item.count) : null,
    }))
    .filter((item) => item.count > 0 || item.stock > 0)
    .sort((a, b) => b.count - a.count);

  return {
    conferencesWithGifts: settingsByConference.size,
    issuances: issuances.filter((row) => settingsByConference.has(row.conferenceId)).length,
    fullyIssued,
    partiallyIssued,
    byCategory: Object.entries(byCategory).map(([key, value]) => ({
      key,
      label: GIFT_CATEGORY_LABELS[key] ?? key,
      value,
    })),
    itemCounts,
  };
}

/**
 * Config health for online streams + breakout rooms.
 * @param {Array<{ onlineStream?: unknown; breakoutRooms?: unknown }>} conferences
 */
export function aggregateOnlineConfig(conferences) {
  let withStreams = 0;
  let streamEntries = 0;
  let withBreakouts = 0;
  let breakoutRooms = 0;
  /** @type {Record<string, number>} */
  const streamPlatforms = {};
  /** @type {Record<string, number>} */
  const breakoutPlatforms = {};

  for (const conf of conferences) {
    const streams = normalizeOnlineStream(conf.onlineStream);
    if (streams.length > 0) {
      withStreams += 1;
      streamEntries += streams.length;
      for (const entry of streams) {
        const key = entry.platform || "Unnamed";
        streamPlatforms[key] = (streamPlatforms[key] ?? 0) + 1;
      }
    }
    const breakout = normalizeBreakoutRooms(conf.breakoutRooms);
    if (breakout.allowed && breakout.rooms.length > 0) {
      withBreakouts += 1;
      breakoutRooms += breakout.rooms.length;
      for (const room of breakout.rooms) {
        const key = room.platform || "Unnamed";
        breakoutPlatforms[key] = (breakoutPlatforms[key] ?? 0) + 1;
      }
    }
  }

  return {
    withStreams,
    streamEntries,
    withBreakouts,
    breakoutRooms,
    streamPlatforms: Object.entries(streamPlatforms)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    breakoutPlatforms: Object.entries(breakoutPlatforms)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
  };
}
