import { existsSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { colors } from "@/theme/tokens";
import { getAppUrl } from "@/lib/email/config";
import { certificateNumberToVerifyToken } from "@/lib/certificates/number";
import { CertificatePdfDocument } from "@/lib/certificates/CertificatePdfDocument";

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
 * Absolute HTTPS/HTTP URL for QR codes (must include protocol or scanners show plain text).
 * @param {string} certificateNumber
 */
export function buildCertificateVerifyUrl(certificateNumber) {
  const appUrl = getAppUrl();
  const token = certificateNumberToVerifyToken(certificateNumber);
  return `${appUrl}/certificates/verify/${encodeURIComponent(token)}`;
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
 * }} data
 */
export async function renderCertificatePdf(data) {
  const verifyUrl = buildCertificateVerifyUrl(data.certificateNumber);

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 160,
    color: {
      dark: colors.primary.dark,
      light: "#ffffff",
    },
  });

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
    }),
  );
}
