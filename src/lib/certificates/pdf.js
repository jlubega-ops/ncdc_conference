import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, pushGraphicsState, popGraphicsState, concatTransformationMatrix } from "pdf-lib";
import QRCode from "qrcode";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { colors } from "@/theme/tokens";
import { getAppUrl } from "@/lib/email/config";
import { certificateNumberToVerifyToken } from "@/lib/certificates/number";
import { CertificatePdfDocument } from "@/lib/certificates/CertificatePdfDocument";
import { normalizeCertificateSettings } from "@/lib/certificates/settings";

/** Bundled NCDC A4 landscape certificate (points). */
export const DEFAULT_CERTIFICATE_TEMPLATE_PATH = path.join(
  process.cwd(),
  "public",
  "assets",
  "certificates",
  "default-template.pdf",
);

/**
 * Layout measured from the default NCDC template PDF text positions
 * (pdf.js coordinates, origin bottom-left).
 *
 * Name sits on the long dotted line under "This is to certify that".
 * QR sits in the bottom-right corner below signature block.
 */
export const DEFAULT_TEMPLATE_LAYOUT = {
  /** Baseline Y of recipient name (PDF points from bottom). */
  nameY: 340,
  /** Horizontal center of the name dotted line (not page center — left panel). */
  nameCenterX: 521,
  /** Max width for the name so it stays on the dotted rule (one line). */
  nameMaxWidth: 520,
  nameFontSizeMax: 28,
  /** Floor before we apply horizontal squeeze for very long names. */
  nameFontSizeMin: 8,
  /** Deep green that pops on the cream/green design. */
  nameColor: rgb(0.04, 0.22, 0.16),
  qrSize: 64,
  qrMarginRight: 30,
  qrMarginBottom: 26,
  /** White pad so the QR never blends into decorative background. */
  qrPad: 8,
};

/**
 * Absolute HTTPS/HTTP URL for QR codes (must include protocol or scanners show plain text).
 * @param {string} certificateNumber
 */
export function buildCertificateVerifyUrl(certificateNumber) {
  const appUrl = getAppUrl();
  const token = certificateNumberToVerifyToken(certificateNumber);
  return `${appUrl}/certificates/verify/${encodeURIComponent(token)}`;
}

/**
 * @param {string | null | undefined} logoUrl
 */
function resolveCertificateLogoSrc(logoUrl) {
  const fallback = path.join(process.cwd(), "public", "assets", "logo.png");
  const value = String(logoUrl || "").trim();
  if (!value) return fallback;
  if (value.startsWith("/uploads/")) {
    const current = path.join(process.cwd(), "storage", "public", value.replace(/^\//, ""));
    if (existsSync(current)) return current;
  }
  if (value.startsWith("/")) {
    const publicPath = path.join(process.cwd(), "public", value.replace(/^\//, ""));
    if (existsSync(publicPath)) return publicPath;
  }
  return fallback;
}

/**
 * Resolve on-disk path for a certificate template URL or default asset.
 * @param {string | null | undefined} templateUrl
 */
export function resolveCertificateTemplatePath(templateUrl) {
  const value = String(templateUrl || "").trim();
  if (value.startsWith("/uploads/")) {
    const current = path.join(process.cwd(), "storage", "public", value.replace(/^\//, ""));
    if (existsSync(current)) return current;
    const legacy = path.join(process.cwd(), "public", value.replace(/^\//, ""));
    if (existsSync(legacy)) return legacy;
  }
  if (value.startsWith("/assets/")) {
    const asset = path.join(process.cwd(), "public", value.replace(/^\//, ""));
    if (existsSync(asset)) return asset;
  }
  if (existsSync(DEFAULT_CERTIFICATE_TEMPLATE_PATH)) {
    return DEFAULT_CERTIFICATE_TEMPLATE_PATH;
  }
  return null;
}

/**
 * Certificate display name: uppercase, single-line whitespace.
 * @param {string | null | undefined} raw
 */
export function formatCertificateRecipientName(raw) {
  const name = String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("en-US");
  return name || "PARTICIPANT";
}

/**
 * Fit recipient name on one line: shrink font, then squeeze horizontally if needed.
 * Never wraps to a second line.
 * @param {import('pdf-lib').PDFFont} font
 * @param {string} name
 * @param {number} maxWidth
 * @param {number} maxSize
 * @param {number} minSize
 * @returns {{ size: number; textWidth: number; horizontalScale: number }}
 */
function fitNameOnOneLine(font, name, maxWidth, maxSize, minSize) {
  let size = maxSize;
  while (size > minSize && font.widthOfTextAtSize(name, size) > maxWidth) {
    size -= 0.25;
  }
  let naturalWidth = font.widthOfTextAtSize(name, size);
  let horizontalScale = 1;
  if (naturalWidth > maxWidth && naturalWidth > 0) {
    horizontalScale = maxWidth / naturalWidth;
    naturalWidth = maxWidth;
  }
  return { size, textWidth: naturalWidth, horizontalScale };
}

/**
 * Stamp recipient name + verification QR onto an A4 landscape PDF template.
 * Does not redraw the certificate artwork — only overlays dynamic fields.
 *
 * @param {Buffer} templateBytes
 * @param {{
 *   recipientName: string;
 *   certificateNumber: string;
 *   verifyUrl: string;
 *   layout?: typeof DEFAULT_TEMPLATE_LAYOUT;
 * }} opts
 */
export async function stampCertificateTemplate(templateBytes, opts) {
  const layout = { ...DEFAULT_TEMPLATE_LAYOUT, ...(opts.layout || {}) };
  const doc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  if (pages.length < 1) {
    throw new Error("Certificate template has no pages.");
  }
  const page = pages[0];
  const { width, height } = page.getSize();

  // Soft A4 landscape check (allow slight export variance).
  const isLandscape = width > height;
  if (!isLandscape) {
    throw new Error("Certificate template must be A4 landscape.");
  }

  const font = await doc.embedFont(StandardFonts.TimesRomanBold);
  const name = formatCertificateRecipientName(opts.recipientName);
  const { size, textWidth, horizontalScale } = fitNameOnOneLine(
    font,
    name,
    layout.nameMaxWidth,
    layout.nameFontSizeMax,
    layout.nameFontSizeMin,
  );
  const nameX = layout.nameCenterX - textWidth / 2;
  // Keep name on the page even if centering math drifts.
  const clampedX = Math.max(24, Math.min(nameX, width - textWidth - 24));

  // pdf-lib drawText never wraps unless maxWidth is set — keep one line.
  // For very long names, shrink font then squeeze horizontally so it still fits.
  if (horizontalScale < 0.999) {
    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(horizontalScale, 0, 0, 1, clampedX, layout.nameY),
    );
    page.drawText(name, {
      x: 0,
      y: 0,
      size,
      font,
      color: layout.nameColor,
    });
    page.pushOperators(popGraphicsState());
  } else {
    page.drawText(name, {
      x: clampedX,
      y: layout.nameY,
      size,
      font,
      color: layout.nameColor,
    });
  }

  const qrDataUrl = await QRCode.toDataURL(opts.verifyUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: {
      dark: "#0a3d32",
      light: "#ffffff",
    },
  });
  const qrPng = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
  const qrImage = await doc.embedPng(qrPng);

  const qrSize = layout.qrSize;
  const qrX = width - layout.qrMarginRight - qrSize;
  const qrY = layout.qrMarginBottom;
  const pad = layout.qrPad;

  // White backing so QR never covers / blends with certificate art.
  page.drawRectangle({
    x: qrX - pad,
    y: qrY - pad,
    width: qrSize + pad * 2,
    height: qrSize + pad * 2 + 10,
    color: rgb(1, 1, 1),
  });

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY + 8,
    width: qrSize,
    height: qrSize,
  });

  const captionFont = await doc.embedFont(StandardFonts.Helvetica);
  const caption = "Scan to verify";
  const captionSize = 6;
  const captionWidth = captionFont.widthOfTextAtSize(caption, captionSize);
  page.drawText(caption, {
    x: qrX + (qrSize - captionWidth) / 2,
    y: qrY,
    size: captionSize,
    font: captionFont,
    color: rgb(0.35, 0.4, 0.38),
  });

  // Keep certificate number tiny near QR for support (does not overlap signatures).
  const numberFont = await doc.embedFont(StandardFonts.Courier);
  const number = String(opts.certificateNumber || "").slice(0, 40);
  const numberSize = 5.5;
  const numberWidth = numberFont.widthOfTextAtSize(number, numberSize);
  page.drawText(number, {
    x: Math.max(8, qrX + (qrSize - numberWidth) / 2),
    y: Math.max(6, qrY - pad + 1),
    size: numberSize,
    font: numberFont,
    color: rgb(0.45, 0.5, 0.48),
  });

  const stamped = await doc.save();
  return Buffer.from(stamped);
}

/**
 * Programmatic fallback when no PDF template is available.
 * @param {object} data
 * @param {string} verifyUrl
 * @param {string} qrDataUrl
 */
async function renderProgrammaticCertificate(data, verifyUrl, qrDataUrl) {
  return renderToBuffer(
    createElement(CertificatePdfDocument, {
      recipientName: data.recipientName,
      conferenceTitle: data.conferenceTitle,
      conferenceTheme: data.conferenceTheme,
      dateRange: data.dateRange,
      attendancePercent: data.attendancePercent,
      daysAttended: data.daysAttended,
      totalDays: data.totalDays,
      certificateNumber: data.certificateNumber,
      issuedAt: data.issuedAt,
      qrDataUrl,
      organiserName: data.organiserName,
      organiserShortName: data.organiserShortName,
      logoSrc: resolveCertificateLogoSrc(data.organiserLogo),
      verifyUrl,
    }),
  );
}

/**
 * @param {{
 *   recipientName: string;
 *   conferenceTitle: string;
 *   conferenceTheme?: string | null;
 *   dateRange?: string | null;
 *   attendancePercent: number;
 *   daysAttended: number;
 *   totalDays: number;
 *   certificateNumber: string;
 *   issuedAt: Date | string;
 *   verifyUrl?: string;
 *   organiserName?: string | null;
 *   organiserShortName?: string | null;
 *   organiserLogo?: string | null;
 *   certificateSettings?: unknown;
 * }} data
 */
export async function renderCertificatePdf(data) {
  const verifyUrl = data.verifyUrl || buildCertificateVerifyUrl(data.certificateNumber);
  const settings = normalizeCertificateSettings(data.certificateSettings);
  const templatePath = resolveCertificateTemplatePath(settings.templateUrl);

  if (templatePath) {
    try {
      const templateBytes = await readFile(/* turbopackIgnore: true */ templatePath);
      return await stampCertificateTemplate(templateBytes, {
        recipientName: data.recipientName,
        certificateNumber: data.certificateNumber,
        verifyUrl,
      });
    } catch (err) {
      console.warn("[certificate] Template stamp failed, using programmatic layout:", err);
    }
  }

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 160,
    color: {
      dark: colors.primary.dark,
      light: "#ffffff",
    },
  });

  return renderProgrammaticCertificate(data, verifyUrl, qrDataUrl);
}
