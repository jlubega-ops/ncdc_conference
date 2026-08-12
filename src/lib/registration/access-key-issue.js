import { getAppUrl } from "@/lib/email/config";
import {
  createConferenceAccessKeyRecord,
  deleteConferenceAccessKeysForUser,
} from "@/lib/auth/access-key";
import { getConferenceYear } from "@/lib/conferences/registrable";
import { sendEmail } from "@/lib/email/mailer";
import { wrapEmailTemplate } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";

/**
 * Issue (or re-issue) an access key and email it to the attendee when possible.
 * Previous keys for this user/conference are permanently deleted.
 * Plaintext short code is stored for admin view/copy and returned to callers.
 * @param {{
 *   user: { id: string; email: string; name?: string | null };
 *   conference: any;
 *   revokeExisting?: boolean;
 *   sendEmail?: boolean;
 * }} params
 */
export async function issueAndEmailAccessKey({
  user,
  conference,
  revokeExisting = true,
  sendEmail: shouldSendEmail = true,
}) {
  const year = getConferenceYear(conference);
  const email = user.email.toLowerCase();
  const isPlaceholderEmail =
    email.endsWith("@ncdc.local") || email.includes("@no-email.");

  if (revokeExisting) {
    await deleteConferenceAccessKeysForUser({
      conferenceId: conference.id,
      email,
      userId: user.id,
    });
  }

  const { displayKey } = await createConferenceAccessKeyRecord({
    conferenceId: conference.id,
    email,
    year,
    userId: user.id,
    organiserShortName: conference.organiserShortName,
  });

  let emailSent = false;
  if (shouldSendEmail && !isPlaceholderEmail) {
    const appUrl = getAppUrl();
    const accessUrl = `${appUrl}/access`;
    const name = user.name || email;

    const emailResult = await sendEmail({
      to: email,
      subject: `Your access code — ${conference.title}`,
      html: wrapEmailTemplate({
        title: "Conference access code",
        preheader: `Access code for ${conference.title}`,
        bodyHtml: `
          <p>Hello ${name},</p>
          <p>You can now access <strong>${conference.title}</strong> with the access code below. This code is unique on the platform and only opens this conference for you.</p>
          <p style="margin:16px 0;padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
            <strong>Email:</strong> ${email}<br/>
            <strong>Access code:</strong><br/>
            <code style="font-size:22px;letter-spacing:3px;font-weight:700;">${displayKey}</code>
          </p>
          <p>Keep this code private. Sign in on the access code page. You will be taken to this conference. Only one active session is allowed at a time.</p>
          ${conference.reference ? `<p style="font-size:13px;color:#5c5c5c;">Conference reference: <strong>${conference.reference}</strong></p>` : ""}
        `,
        cta: { label: "Sign in with access code", href: accessUrl },
      }),
    });
    emailSent = emailResult.ok;
    if (emailSent) {
      await prisma.conferenceAccessKey.updateMany({
        where: {
          conferenceId: conference.id,
          displayCode: displayKey,
          revokedAt: null,
        },
        data: { emailedAt: new Date() },
      });
    }
  }

  return {
    emailSent,
    emailSkipped: !shouldSendEmail || isPlaceholderEmail,
    accessKey: displayKey,
    displayCode: displayKey,
  };
}
