import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/lib/email/config";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const config = getSmtpConfig();
  if (!config) return null;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    ...(config.isGmail && !config.secure
      ? { requireTLS: true, tls: { minVersion: "TLSv1.2" } }
      : {}),
  });

  return transporter;
}

/**
 * @param {Error} err
 */
function formatSmtpError(err) {
  if (err.code === "EAUTH") {
    return (
      "SMTP authentication failed. For Gmail, use an App Password (not your normal password): " +
      "https://support.google.com/accounts/answer/185833 — SMTP_USER must be your full @gmail.com address."
    );
  }
  return err.message || "Could not send email.";
}

/**
 * Sends email; never throws. Registration and other flows should continue if mail fails.
 * @param {{ to: string, subject: string, html: string, text?: string, attachments?: Array<{ filename: string; content: Buffer; contentType?: string }> }} options
 */
export async function sendEmail({ to, subject, html, text, attachments, fromName }) {
  const config = getSmtpConfig();
  const transport = getTransporter();

  if (!config || !transport) {
    console.warn("[email] SMTP not configured. Would send to:", to, subject);
    return { ok: false, skipped: true, error: "SMTP not configured" };
  }

  let from = config.from;
  if (fromName) {
    const safe = String(fromName).replace(/[\r\n"]/g, "").slice(0, 80);
    const addr = /<([^>]+)>/.exec(config.from)?.[1] || config.from;
    from = `"${safe}" <${addr}>`;
  }

  try {
    await transport.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      attachments,
    });
    return { ok: true };
  } catch (err) {
    const message = formatSmtpError(err instanceof Error ? err : new Error(String(err)));
    console.error("[email] Send failed:", message, err);
    return { ok: false, error: message };
  }
}
