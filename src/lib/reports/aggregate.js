import { GENDER_OPTIONS, AGE_RANGES, ATTENDANCE_MODES } from "@/lib/registration/constants";
import { PAPER_STATUS_LABELS } from "@/lib/papers/constants";

const GENDER_LABELS = Object.fromEntries(GENDER_OPTIONS.map((g) => [g.value, g.label]));
const AGE_LABELS = Object.fromEntries(AGE_RANGES.map((a) => [a.value, a.label]));
const MODE_LABELS = Object.fromEntries(ATTENDANCE_MODES.map((m) => [m.value, m.label]));

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
 * @param {Array<{ rating: number | null }>} feedback
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

  return {
    total: feedback.length,
    avgRating: avg,
    withRating: ratings.length,
    byRating: [5, 4, 3, 2, 1].map((n) => ({
      label: `${n} star${n > 1 ? "s" : ""}`,
      value: byRating[n] ?? 0,
    })),
  };
}
