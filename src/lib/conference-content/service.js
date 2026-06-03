import { prisma } from "@/lib/prisma";
import { savePrivateUpload } from "@/lib/storage/secure-files";
import { normalizeSpeaker } from "@/lib/conferences/utils";
import { ALLOWED_RESOURCE_MIME, MAX_RESOURCE_BYTES, RESOURCE_TYPES } from "./constants";

/**
 * @param {any} row
 */
function mapResource(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    fileId: row.fileId,
    fileName: row.fileName,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    downloadUrl: `/api/files/conference-resources/${row.fileId}`,
  };
}

/**
 * @param {any} row
 */
function mapPresentation(row) {
  return {
    id: row.id,
    title: row.title,
    speakerName: row.speakerName,
    speakerTitle: row.speakerTitle,
    sessionLabel: row.sessionLabel,
    description: row.description,
    fileId: row.fileId,
    fileName: row.fileName,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    downloadUrl: row.fileId ? `/api/files/conference-resources/${row.fileId}` : null,
  };
}

/**
 * @param {string} conferenceId
 * @param {string} type
 */
export async function listConferenceResources(conferenceId, type) {
  const rows = await prisma.conferenceResource.findMany({
    where: { conferenceId, type },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapResource);
}

/**
 * @param {string} conferenceId
 */
export async function listConferencePresentations(conferenceId) {
  const rows = await prisma.conferencePresentation.findMany({
    where: { conferenceId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapPresentation);
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
  const description = String(form.get("description") ?? "").trim() || null;
  const file = form.get("file");
  if (!title) throw new Error("Title is required.");

  const { fileId, fileName } = await saveResourceFile(file);
  const row = await prisma.conferenceResource.create({
    data: {
      conferenceId,
      type,
      title,
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
  const speakerTitle = String(form.get("speakerTitle") ?? "").trim() || null;
  const sessionLabel = String(form.get("sessionLabel") ?? "").trim() || null;
  const description = String(form.get("description") ?? "").trim() || null;
  const file = form.get("file");

  if (!title) throw new Error("Title is required.");

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
  return mapPresentation(row);
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
