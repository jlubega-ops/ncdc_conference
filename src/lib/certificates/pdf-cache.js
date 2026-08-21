import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

function certificatePdfPath(certificateId) {
  // v2: uppercase single-line name layout — orphan older caches so they regenerate.
  return path.join(
    process.cwd(),
    "storage",
    "private",
    "certificates",
    `${certificateId}.v2.pdf`,
  );
}

/**
 * @param {string} certificateId
 * @returns {Promise<Buffer | null>}
 */
export async function readCachedCertificatePdf(certificateId) {
  try {
    const filePath = certificatePdfPath(certificateId);
    return await readFile(/* turbopackIgnore: true */ filePath);
  } catch {
    return null;
  }
}

/**
 * @param {string} certificateId
 * @param {Buffer} buffer
 */
export async function writeCachedCertificatePdf(certificateId, buffer) {
  const filePath = certificatePdfPath(certificateId);
  const dir = path.dirname(filePath);
  await mkdir(/* turbopackIgnore: true */ dir, { recursive: true });
  await writeFile(/* turbopackIgnore: true */ filePath, buffer);
}

/**
 * @param {string} certificateId
 */
export async function deleteCachedCertificatePdf(certificateId) {
  try {
    await unlink(/* turbopackIgnore: true */ certificatePdfPath(certificateId));
  } catch {
    /* missing cache is fine */
  }
}
