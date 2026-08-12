import { prisma } from "@/lib/prisma";
import { savePrivateUpload } from "@/lib/storage/secure-files";
import { normalizeSpeaker } from "@/lib/conferences/utils";
import { normalizeConferenceDays } from "@/lib/attendance/utils";
import { ALLOWED_RESOURCE_MIME, MAX_RESOURCE_BYTES, RESOURCE_TYPES } from "./constants";
import { formatPresentationDayLabel } from "./presentation-days";

/**
 * @param {any} row
 * @param {{ includeFileAccess?: boolean }} [opts]
 */
function mapResource(row, opts = {}) {
  const includeFileAccess = opts.includeFileAccess !== false;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    author: row.author ?? null,
    description: row.description,
    fileName: row.fileName,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    ...(includeFileAccess
      ? {
          fileId: row.fileId,
          downloadUrl: `/api/files/conference-resources/${row.fileId}`,
        }
      : {}),
  };
}

/**
 * @param {any} row
 * @param {Array<{ date: string; dayIndex: number }>} [days]
 * @param {{ includeFileAccess?: boolean }} [opts]
 */
function mapPresentation(row, days = [], opts = {}) {
  const includeFileAccess = opts.includeFileAccess !== false;
  const sessionLabel = row.sessionLabel ? String(row.sessionLabel).trim() : null;
  const day = days.find((d) => d.date === sessionLabel) || null;
  return {
    id: row.id,
    title: row.title,
    speakerName: row.speakerName,
    speakerTitle: row.speakerTitle,
    sessionLabel,
    description: row.description,
    fileName: row.fileName,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    dayIndex: day?.dayIndex ?? null,
    dayLabel: day
      ? formatPresentationDayLabel(day.date, day.dayIndex)
      : sessionLabel || "Unassigned",
    hasFile: Boolean(row.fileId),
    ...(includeFileAccess
      ? {
          fileId: row.fileId,
          downloadUrl: row.fileId ? `/api/files/conference-resources/${row.fileId}` : null,
        }
      : {}),
  };
}

/**
 * @param {string} conferenceId
 * @param {string} type
 * @param {{ includeFileAccess?: boolean }} [opts]
 */
export async function listConferenceResources(conferenceId, type, opts = {}) {
  const rows = await prisma.conferenceResource.findMany({
    where: { conferenceId, type },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((row) => mapResource(row, opts));
}

/**
 * @param {string} conferenceId
 * @param {{ includeFileAccess?: boolean }} [opts]
 */
export async function listConferencePresentations(conferenceId, opts = {}) {
  const [rows, conference] = await Promise.all([
    prisma.conferencePresentation.findMany({
      where: { conferenceId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { conferenceDays: true },
    }),
  ]);
  const days = normalizeConferenceDays(conference?.conferenceDays);
  return rows.map((row) => mapPresentation(row, days, opts));
}

/**
 * Conference days for presentation day dropdowns.
 * @param {string} conferenceId
 */
export async function getConferenceDaysForPresentations(conferenceId) {
  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { conferenceDays: true },
  });
  return normalizeConferenceDays(conference?.conferenceDays).map((d) => ({
    date: d.date,
    dayIndex: d.dayIndex,
    label: formatPresentationDayLabel(d.date, d.dayIndex),
  }));
}

/**
 * Lightweight counts so attendee tabs can hide empty material categories.
 * @param {string} conferenceId
 */
export async function getMemberContentAvailability(conferenceId) {
  const [materials, paperTemplates, presentationTemplates, presentations] =
    await Promise.all([
      prisma.conferenceResource.count({
        where: { conferenceId, type: RESOURCE_TYPES.MATERIAL },
      }),
      prisma.conferenceResource.count({
        where: { conferenceId, type: RESOURCE_TYPES.PAPER_TEMPLATE },
      }),
      prisma.conferenceResource.count({
        where: { conferenceId, type: RESOURCE_TYPES.PRESENTATION_TEMPLATE },
      }),
      prisma.conferencePresentation.count({ where: { conferenceId } }),
    ]);

  return {
    materials,
    paperTemplates,
    presentationTemplates,
    presentations,
    hasAny:
      materials > 0 ||
      paperTemplates > 0 ||
      presentationTemplates > 0 ||
      presentations > 0,
  };
}

/**
 * @param {File} file
 */
async function saveResourceFile(file) {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A file is required.");
  }
  if (!ALLOWED_RESOURCE_MIME.has(file.type)) {
    throw new Error("Unsupported file type.");
  }
  if (file.size > MAX_RESOURCE_BYTES) {
    throw new Error("File must be 15MB or smaller.");
  }
  const fileId = await savePrivateUpload(file, "conference-resources");
  if (!fileId) throw new Error("Could not save file.");
  return { fileId, fileName: file.name };
}

/**
 * @param {string} conferenceId
 * @param {string} type
 * @param {FormData} form
 */
export async function createConferenceResource(conferenceId, type, form) {
  if (!Object.values(RESOURCE_TYPES).includes(type)) {
    throw new Error("Invalid resource type.");
  }
  const title = String(form.get("title") ?? "").trim();
  const author = String(form.get("author") ?? "").trim() || null;
  const description = String(form.get("description") ?? "").trim() || null;
  const file = form.get("file");
  if (!title) throw new Error("Title is required.");

  const { fileId, fileName } = await saveResourceFile(file);
  const row = await prisma.conferenceResource.create({
    data: {
      conferenceId,
      type,
      title,
      author,
      description,
      fileId,
      fileName,
    },
  });
  return mapResource(row);
}

/**
 * @param {string} conferenceId
 * @param {string} resourceId
 * @param {FormData} form
 */
export async function updateConferenceResource(conferenceId, resourceId, form) {
  const existing = await prisma.conferenceResource.findFirst({
    where: { id: resourceId, conferenceId },
  });
  if (!existing) throw new Error("Resource not found.");

  const title = String(form.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");
  const author = String(form.get("author") ?? "").trim() || null;
  const description = String(form.get("description") ?? "").trim() || null;
  const file = form.get("file");

  /** @type {{ title: string; author: string | null; description: string | null; fileId?: string; fileName?: string }} */
  const data = { title, author, description };

  if (file instanceof File && file.size > 0) {
    const saved = await saveResourceFile(file);
    data.fileId = saved.fileId;
    data.fileName = saved.fileName;
  }

  const row = await prisma.conferenceResource.update({
    where: { id: resourceId },
    data,
  });
  return mapResource(row);
}

/**
 * @param {string} conferenceId
 * @param {string} resourceId
 */
export async function deleteConferenceResource(conferenceId, resourceId) {
  const row = await prisma.conferenceResource.findFirst({
    where: { id: resourceId, conferenceId },
  });
  if (!row) throw new Error("Resource not found.");
  await prisma.conferenceResource.delete({ where: { id: resourceId } });
  return { ok: true };
}

/**
 * @param {string} conferenceId
 * @param {FormData} form
 */
export async function createConferencePresentation(conferenceId, form) {
  const title = String(form.get("title") ?? "").trim();
  const speakerName = String(form.get("speakerName") ?? "").trim() || null;
  let speakerTitle = String(form.get("speakerTitle") ?? "").trim() || null;
  const sessionLabel = String(form.get("sessionLabel") ?? "").trim() || null;
  const description = String(form.get("description") ?? "").trim() || null;
  const file = form.get("file");

  if (!title) throw new Error("Title is required.");
  if (!sessionLabel) throw new Error("Please select a conference day.");

  const days = await getConferenceDaysForPresentations(conferenceId);
  if (days.length === 0) {
    throw new Error("Add conference days in the conference schedule before uploading presentations.");
  }
  if (!days.some((d) => d.date === sessionLabel)) {
    throw new Error("Selected day is not part of this conference schedule.");
  }

  // If title not sent, pull it from a matching saved speaker profile.
  if (speakerName && !speakerTitle) {
    const speakers = await getConferenceSpeakers(conferenceId);
    const match = speakers.find(
      (s) => String(s.name || "").trim().toLowerCase() === speakerName.toLowerCase(),
    );
    if (match?.title) speakerTitle = String(match.title).trim() || null;
  }

  let fileId = null;
  let fileName = null;
  if (file instanceof File && file.size > 0) {
    const saved = await saveResourceFile(file);
    fileId = saved.fileId;
    fileName = saved.fileName;
  }

  const row = await prisma.conferencePresentation.create({
    data: {
      conferenceId,
      title,
      speakerName,
      speakerTitle,
      sessionLabel,
      description,
      fileId,
      fileName,
    },
  });
  return mapPresentation(row, days.map((d) => ({ date: d.date, dayIndex: d.dayIndex })));
}

/**
 * @param {string} conferenceId
 * @param {string} presentationId
 */
export async function deleteConferencePresentation(conferenceId, presentationId) {
  const row = await prisma.conferencePresentation.findFirst({
    where: { id: presentationId, conferenceId },
  });
  if (!row) throw new Error("Presentation not found.");
  await prisma.conferencePresentation.delete({ where: { id: presentationId } });
  return { ok: true };
}

/**
 * @param {string} conferenceId
 */
export async function getConferenceSpeakers(conferenceId) {
  const row = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { speakers: true },
  });
  return normalizeSpeakersList(row?.speakers);
}

/**
 * @param {unknown} raw
 */
function normalizeSpeakersList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeSpeaker).filter(Boolean);
}

/**
 * @param {string} conferenceId
 * @param {unknown} speakers
 */
export async function updateConferenceSpeakers(conferenceId, speakers) {
  const normalized = normalizeSpeakersList(speakers);
  await prisma.conference.update({
    where: { id: conferenceId },
    data: { speakers: normalized },
  });
  return normalized;
}

/**
 * Resolve a member-facing file by resource or presentation id (not raw fileId).
 * @param {string} conferenceId
 * @param {"resource" | "presentation"} kind
 * @param {string} itemId
 */
export async function resolveMemberContentFile(conferenceId, kind, itemId) {
  if (kind === "resource") {
    const row = await prisma.conferenceResource.findFirst({
      where: { id: itemId, conferenceId },
      select: { fileId: true, fileName: true, title: true },
    });
    if (!row?.fileId) return null;
    return { fileId: row.fileId, fileName: row.fileName || row.title || itemId };
  }

  if (kind === "presentation") {
    const row = await prisma.conferencePresentation.findFirst({
      where: { id: itemId, conferenceId },
      select: { fileId: true, fileName: true, title: true },
    });
    if (!row?.fileId) return null;
    return { fileId: row.fileId, fileName: row.fileName || row.title || itemId };
  }

  return null;
}

/**
 * @param {string} fileId
 */
export async function resolveConferenceResourceFile(fileId) {
  const resource = await prisma.conferenceResource.findFirst({
    where: { fileId },
    select: { conferenceId: true, fileId: true, fileName: true },
  });
  if (resource) return { conferenceId: resource.conferenceId, fileName: resource.fileName };

  const presentation = await prisma.conferencePresentation.findFirst({
    where: { fileId },
    select: { conferenceId: true, fileId: true, fileName: true },
  });
  if (presentation) {
    return { conferenceId: presentation.conferenceId, fileName: presentation.fileName };
  }
  return null;
}
