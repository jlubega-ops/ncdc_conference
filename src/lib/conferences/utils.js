import { format, isValid, parseISO } from "date-fns";

/**
 * @param {string} title
 */
export function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * @param {Date | string | null | undefined} start
 * @param {Date | string | null | undefined} end
 */
export function formatDateRange(start, end) {
  if (!start) return "";
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "";
  if (!end) return format(s, "d MMM yyyy");
  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return format(s, "d MMM yyyy");
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();
  if (sameMonth) {
    return `${format(s, "d")}–${format(e, "d MMMM yyyy")}`;
  }
  if (sameYear) {
    return `${format(s, "d MMM")}–${format(e, "d MMM yyyy")}`;
  }
  return `${format(s, "d MMM yyyy")} – ${format(e, "d MMM yyyy")}`;
}

/**
 * @param {Date | string | null | undefined} d
 */
export function toDateInputValue(d) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/**
 * @param {string} value
 */
export function parseDateInput(value) {
  if (!value?.trim()) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** @param {unknown} json */
export function parseJsonArray(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  return [];
}

export function formatDeadlineDate(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "d MMM");
}

export function formatFullDate(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "d MMMM yyyy");
}

/**
 * Stable date+time for tables (avoids locale/timezone hydration drift).
 * @param {Date | string | null | undefined} value
 */
export function formatAdminDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "d MMM yyyy, HH:mm");
}

/** @param {Date | string | null | undefined} value */
export function formatAdminDateOnly(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "d MMM yyyy");
}

/**
 * @param {string} dateStr - YYYY-MM-DD
 */
export function formatProgrammeDayLabel(dateStr) {
  if (!dateStr) return "";
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return dateStr;
  return format(parsed, "EEEE, d MMMM yyyy");
}

/**
 * @param {string} startTime
 * @param {string} endTime
 */
export function formatProgrammeTimeSlot(startTime, endTime) {
  if (!startTime && !endTime) return "—";
  if (!endTime) return startTime;
  if (!startTime) return endTime;
  return `${startTime} – ${endTime}`;
}

export function emptyPaymentDetails() {
  return {
    accountName: "",
    accountNumber: "",
    bankName: "",
    bankBranch: "",
    swiftCode: "",
  };
}

export function emptyOnlineStream() {
  return {
    youtubeLink: "",
    zoomDetails: "",
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeOnlineStream(raw) {
  const base = emptyOnlineStream();
  if (!raw || typeof raw !== "object") return base;
  return {
    youtubeLink: String(raw.youtubeLink || "").trim(),
    zoomDetails: String(raw.zoomDetails || "").trim(),
  };
}

export function emptyContacts() {
  return {
    emails: [],
    phone: "",
    website: "",
    moreInfo: "",
  };
}

/**
 * @param {unknown} raw
 */
export function normalizePaymentDetails(raw) {
  const base = emptyPaymentDetails();
  if (!raw || typeof raw !== "object") return base;
  return {
    accountName: String(raw.accountName || "").trim(),
    accountNumber: String(raw.accountNumber || "").trim(),
    bankName: String(raw.bankName || "").trim(),
    bankBranch: String(raw.bankBranch || "").trim(),
    swiftCode: String(raw.swiftCode || "").trim(),
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeContacts(raw) {
  const base = emptyContacts();
  if (!raw || typeof raw !== "object") return base;

  let emails = [];
  if (Array.isArray(raw.emails)) {
    emails = raw.emails.map((item) => String(item).trim()).filter(Boolean);
  } else if (raw.email) {
    emails = String(raw.email)
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return {
    emails,
    phone: String(raw.phone || raw.tel || "").trim(),
    website: String(raw.website || "").trim(),
    moreInfo: String(raw.moreInfo || "").trim(),
  };
}

export function createFaqId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `faq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSpeakerId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `speaker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @param {unknown} raw
 */
/**
 * @param {string} html
 */
export function isRichTextEmpty(html) {
  if (!html?.trim()) return true;
  const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return !text;
}

/**
 * @param {unknown} raw
 */
export function normalizeFaq(raw) {
  if (!raw || typeof raw !== "object") return null;
  const question = String(raw.question || raw.title || "").trim();
  if (!question) return null;
  const answer = String(raw.answer || raw.description || "").trim();
  return {
    id: raw.id || createFaqId(),
    question,
    answer,
  };
}

export function normalizeSpeaker(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim();
  if (!name) return null;

  const dates = Array.isArray(raw.dates) ? raw.dates.filter(Boolean) : [];
  let scheduleMode = raw.scheduleMode;
  if (scheduleMode !== "all" && scheduleMode !== "specific") {
    scheduleMode = dates.length > 0 ? "specific" : "all";
  }

  const speakerType = ["normal", "keynote", "guest", "host", "mc"].includes(raw.speakerType)
    ? raw.speakerType
    : "normal";

  return {
    id: raw.id || createSpeakerId(),
    name,
    title: String(raw.title || raw.role || "").trim(),
    speakerType,
    photo: String(raw.photo || raw.image || "").trim(),
    bio: String(raw.bio || "").trim(),
    scheduleMode,
    dates: scheduleMode === "all" ? [] : dates,
  };
}

/**
 * @param {unknown} speaker
 * @param {string} dateStr
 */
export function speakerAppliesToDate(speaker, dateStr) {
  if (!speaker || !dateStr) return false;
  if (speaker.scheduleMode === "all" || !speaker.dates?.length) return true;
  return speaker.dates.includes(dateStr);
}

/**
 * @param {unknown[]} speakers
 * @param {string} dateStr
 */
export function getSpeakersForDate(speakers, dateStr) {
  return (Array.isArray(speakers) ? speakers : [])
    .map((item) => normalizeSpeaker(item))
    .filter(Boolean)
    .filter((speaker) => speakerAppliesToDate(speaker, dateStr));
}

/**
 * @param {unknown[]} programme
 */
export function groupProgrammeByDate(programme) {
  const map = new Map();
  for (const item of Array.isArray(programme) ? programme : []) {
    if (!item?.date) continue;
    if (!map.has(item.date)) map.set(item.date, []);
    map.get(item.date).push(item);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")),
    }));
}

/**
 * @param {unknown} item
 */
function isFlatProgrammeEntry(item) {
  return Boolean(item && typeof item === "object" && "date" in item);
}

/**
 * @param {unknown[]} programme
 */
export function normalizeProgrammeForDisplay(programme) {
  const list = Array.isArray(programme) ? programme : [];
  if (list.length === 0) return [];

  if (isFlatProgrammeEntry(list[0])) {
    return groupProgrammeByDate(list);
  }

  return list.map((day) => ({
    date: day?.day || "",
    label: day?.day || "",
    items: (Array.isArray(day?.sessions) ? day.sessions : []).map((session) => ({
      title: session?.title || "",
      startTime: session?.time || "",
      endTime: "",
      speaker: session?.speaker || null,
    })),
  }));
}
