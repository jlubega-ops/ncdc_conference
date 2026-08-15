import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const PUBLIC_UPLOAD_CATEGORIES = new Set([
  "speaker-photos",
  "conference-card-images",
  "organiser-logos",
]);

const SAFE_FILENAME = /^[A-Za-z0-9._-]+$/;

/**
 * @param {string} category
 * @param {string} filename
 */
export function publicUploadUrl(category, filename) {
  return `/uploads/${category}/${filename}`;
}

/**
 * @param {string} category
 * @param {Buffer} buffer
 * @param {string} filename
 */
export async function savePublicUpload(category, buffer, filename) {
  if (!PUBLIC_UPLOAD_CATEGORIES.has(category)) {
    throw new Error("Invalid upload category.");
  }
  if (!SAFE_FILENAME.test(filename)) {
    throw new Error("Invalid filename.");
  }

  const dir = path.join(process.cwd(), "storage", "public", "uploads", category);
  const filePath = path.join(
    process.cwd(),
    "storage",
    "public",
    "uploads",
    category,
    filename,
  );
  await mkdir(/* turbopackIgnore: true */ dir, { recursive: true });
  await writeFile(/* turbopackIgnore: true */ filePath, buffer);
  return publicUploadUrl(category, filename);
}

/**
 * @param {string} category
 * @param {string} filename
 */
export async function readPublicUpload(category, filename) {
  if (!PUBLIC_UPLOAD_CATEGORIES.has(category) || !SAFE_FILENAME.test(filename)) {
    throw new Error("Invalid file reference.");
  }

  const currentPath = path.join(
    process.cwd(),
    "storage",
    "public",
    "uploads",
    category,
    filename,
  );
  try {
    return await readFile(/* turbopackIgnore: true */ currentPath);
  } catch {
    /* try files written before runtime uploads moved out of public/ */
  }

  const legacyPath = path.join(
    process.cwd(),
    "public",
    "uploads",
    category,
    filename,
  );
  return readFile(/* turbopackIgnore: true */ legacyPath);
}
