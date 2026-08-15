import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function certificatePdfPath(certificateId) {
  return path.join(
    process.cwd(),
    "storage",
    "private",
    "certificates",
    `${certificateId}.pdf`,
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
