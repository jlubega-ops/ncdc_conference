import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const PRIVATE_ROOT = path.join(process.cwd(), "storage", "private");

/**
 * @param {File} file
 * @param {string} category e.g. payment-proofs
 */
export async function savePrivateUpload(file, category) {
  if (!(file instanceof File) || file.size === 0) return null;

  const ext = file.name?.split(".").pop()?.toLowerCase() || "bin";
  const fileId = `${category}-${randomUUID()}.${ext.replace(/[^a-z0-9]/gi, "")}`;
  const dir = path.join(PRIVATE_ROOT, category);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileId), buffer);
  return fileId;
}

/**
 * @param {string} category
 * @param {string} fileId
 */
export async function readPrivateFile(category, fileId) {
  if (!fileId || fileId.includes("..") || fileId.includes("/")) {
    throw new Error("Invalid file reference.");
  }
  return readFile(path.join(PRIVATE_ROOT, category, fileId));
}

/**
 * @param {string} fileId
 */
export function guessMimeType(fileId) {
  if (fileId.endsWith(".pdf")) return "application/pdf";
  if (fileId.endsWith(".png")) return "image/png";
  if (fileId.endsWith(".webp")) return "image/webp";
  if (fileId.endsWith(".jpg") || fileId.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}
