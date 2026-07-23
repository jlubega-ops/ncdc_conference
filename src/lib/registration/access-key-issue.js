import { getAppUrl } from "@/lib/email/config";
import {
  createConferenceAccessKeyRecord,
  deleteConferenceAccessKeysForUser,
} from "@/lib/auth/access-key";
import { getConferenceYear } from "@/lib/conferences/registrable";
import { sendEmail } from "@/lib/email/mailer";
import { wrapEmailTemplate } from "@/lib/email/templates";

/**
 * Issue (or re-issue) an access key and email it to the attendee.
 * Previous keys for this user/conference are permanently deleted.
 * The plaintext key is emailed once and never stored or returned to admin UIs.
 * @param {{
 *   user: { id: string; email: string; name?: string | null };
 *   conference: any;
 *   revokeExisting?: boolean;
 * }} params
 */
export async function issueAndEmailAccessKey({ user, conference, revokeExisting = true }) {
  const year = getConferenceYear(conference);
  const email = user.email.toLowerCase();

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

  const appUrl = getAppUrl();
  const accessUrl = `${appUrl}/login?mode=access`;
  const name = user.name || email;

  const emailResult = await sendEmail({
    to: email,
    subject: `Your access code — ${conference.title}`,
    html: wrapEmailTemplate({
      title: "Conference access code",
      preheader: `Access code for ${conference.title}`,
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>You can now access <strong>${conference.title}</strong> with the access code below. This code only opens this conference.</p>
        <p style="margin:16px 0;padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
          <strong>Email:</strong> ${email}<br/>
          <strong>Access code:</strong><br/>
          <code style="font-size:15px;letter-spacing:0.5px;text-transform:uppercase;">${displayKey}</code>
        </p>
        <p>Keep this code private. Sign in with <strong>Attendee access</strong>. You will be taken to this conference. Only one active session is allowed at a time.</p>
        ${conference.reference ? `<p style="font-size:13px;color:#5c5c5c;">Conference reference: <strong>${conference.reference}</strong></p>` : ""}
      `,
      cta: { label: "Sign in with access code", href: accessUrl },
    }),
  });

  // Do not return the plaintext key — it is a secret delivered only by email.
  return { emailSent: emailResult.ok };
}
