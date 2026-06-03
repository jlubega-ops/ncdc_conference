import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { colors } from "@/theme/tokens";
import { getAppUrl } from "@/lib/email/config";
import { certificateNumberToVerifyToken } from "@/lib/certificates/number";
import { CertificatePdfDocument } from "@/lib/certificates/CertificatePdfDocument";

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
 * }} data
 */
export async function renderCertificatePdf(data) {
  const verifyUrl = buildCertificateVerifyUrl(data.certificateNumber);

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 280,
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
    }),
  );
}
