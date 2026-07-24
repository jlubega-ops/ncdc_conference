import { getAppUrl } from "@/lib/email/config";

const brand = {
  primary: "#1a5f4a",
  primaryLight: "#e8f5f0",
  text: "#1a1a1a",
  muted: "#5c5c5c",
};

/**
 * @param {{ title: string, preheader?: string, bodyHtml: string, cta?: { label: string, href: string } }} opts
 */
export function wrapEmailTemplate({ title, preheader, bodyHtml, cta }) {
  const appUrl = getAppUrl();
  const logoUrl = `${appUrl}/assets/logo.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:${brand.text};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:${brand.primary};padding:24px 28px;">
              <img src="${logoUrl}" alt="NCDC" width="120" style="display:block;border-radius:6px;background:#fff;padding:4px;" />
              <h1 style="margin:16px 0 0;font-size:20px;font-weight:600;color:#ffffff;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-size:15px;line-height:1.6;color:${brand.text};">
              ${bodyHtml}
              ${
                cta
                  ? `<p style="margin:28px 0 0;"><a href="${cta.href}" style="display:inline-block;background:${brand.primary};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${cta.label}</a></p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:${brand.primaryLight};font-size:12px;color:${brand.muted};border-top:1px solid #e5e7eb;">
              National Curriculum Development Centre (NCDC) · Conference Platform<br />
              <a href="${appUrl}" style="color:${brand.primary};">${appUrl}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function registrationWelcomeEmail({ name, email, password, conferenceTitle }) {
  const appUrl = getAppUrl();
  return {
    subject: `Your NCDC account — ${conferenceTitle}`,
    html: wrapEmailTemplate({
      title: "Registration received",
      preheader: `Sign in with your new account for ${conferenceTitle}`,
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>Thank you for registering for <strong>${conferenceTitle}</strong>.</p>
        <p>Your account has been created. Use the credentials below to sign in. You will be asked to change your password on first login.</p>
        <table style="margin:20px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;width:100%;">
          <tr><td style="padding:12px 16px;"><strong>Email (username):</strong><br/>${email}</td></tr>
          <tr><td style="padding:12px 16px;border-top:1px solid #e5e7eb;"><strong>Temporary password:</strong><br/><code style="font-size:16px;letter-spacing:1px;">${password}</code></td></tr>
        </table>
        <p>Your registration is <strong>pending approval</strong>. Programme details and online links will be available after an administrator approves your application.</p>
      `,
      cta: { label: "Sign in", href: `${appUrl}/login` },
    }),
  };
}

export function registrationReceivedEmail({ name, conferenceTitle }) {
  const appUrl = getAppUrl();
  return {
    subject: `Application received — ${conferenceTitle}`,
    html: wrapEmailTemplate({
      title: "Registration received",
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>Thank you for registering for <strong>${conferenceTitle}</strong>.</p>
        <p>Your application is <strong>pending approval</strong>. You will receive an access code by email once an administrator approves your registration.</p>
      `,
      cta: { label: "Browse conferences", href: `${appUrl}/conferences` },
    }),
  };
}

export function registrationExistingAccountEmail({ name, conferenceTitle }) {
  const appUrl = getAppUrl();
  return {
    subject: `Application received — ${conferenceTitle}`,
    html: wrapEmailTemplate({
      title: "Conference application submitted",
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>We received your application for <strong>${conferenceTitle}</strong> (pending approval).</p>
        <p>You will receive an access code by email once an administrator approves your registration. You can register for multiple conferences with the same email.</p>
      `,
      cta: { label: "Browse conferences", href: `${appUrl}/conferences` },
    }),
  };
}

export function registrationApprovedEmail({ name, conferenceTitle, notes, conferenceSlug }) {
  const appUrl = getAppUrl();
  const notesBlock = notes
    ? `<p style="margin-top:16px;padding:12px 16px;background:#e8f5f0;border-left:4px solid ${brand.primary};"><strong>Note from the organisers:</strong><br/>${notes}</p>`
    : "";
  return {
    subject: `Approved — ${conferenceTitle}`,
    html: wrapEmailTemplate({
      title: "Registration approved",
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>Your registration for <strong>${conferenceTitle}</strong> has been <strong>approved</strong>.</p>
        <p>An access code has been sent in a separate email (or below if combined). Use <strong>Attendee access</strong> on the sign-in page.</p>
        ${notesBlock}
      `,
      cta: { label: "Sign in with access code", href: `${appUrl}/login?mode=access` },
    }),
  };
}

export function registrationRevisionEmail({ name, conferenceTitle, improvementRequest, notes }) {
  const appUrl = getAppUrl();
  return {
    subject: `Action required — ${conferenceTitle}`,
    html: wrapEmailTemplate({
      title: "Please update your registration",
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>Your registration for <strong>${conferenceTitle}</strong> needs attention before it can be approved.</p>
        <p style="padding:12px 16px;background:#fff8e6;border-left:4px solid #d97706;"><strong>Requested improvements:</strong><br/>${improvementRequest}</p>
        ${notes ? `<p><strong>Additional note:</strong> ${notes}</p>` : ""}
        <p>Sign in to view details on your dashboard. You may contact the organisers if you need help.</p>
      `,
      cta: { label: "View my applications", href: `${appUrl}/dashboard/my-registrations` },
    }),
  };
}

export function passwordResetEmail({ name, resetUrl }) {
  return {
    subject: "Reset your NCDC Conference password",
    html: wrapEmailTemplate({
      title: "Password reset",
      bodyHtml: `
        <p>Hello ${name || "there"},</p>
        <p>We received a request to reset your password. This link expires in 1 hour.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
      cta: { label: "Reset password", href: resetUrl },
    }),
  };
}

export function accountWelcomeEmail({ name, email, password }) {
  const appUrl = getAppUrl();
  const loginUrl = `${appUrl}/login?mode=staff`;
  return {
    subject: "Your conference platform account",
    html: wrapEmailTemplate({
      title: "Account created",
      preheader: "Sign in and set your password",
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>An administrator created an account for you on the Conference Platform.</p>
        <p>Use the credentials below to sign in. You will be asked to change your password on first login.</p>
        <table style="margin:20px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;width:100%;">
          <tr><td style="padding:12px 16px;"><strong>Email (username):</strong><br/>${email}</td></tr>
          <tr><td style="padding:12px 16px;border-top:1px solid #e5e7eb;"><strong>Temporary password:</strong><br/><code style="font-size:16px;letter-spacing:1px;">${password}</code></td></tr>
          <tr><td style="padding:12px 16px;border-top:1px solid #e5e7eb;"><strong>System login:</strong><br/><a href="${loginUrl}" style="color:#008e51;word-break:break-all;">${loginUrl}</a></td></tr>
        </table>
      `,
      cta: { label: "Sign in to the system", href: loginUrl },
    }),
  };
}

export function paperRevisionEmail({
  name,
  conferenceTitle,
  paperTitle,
  improvementRequest,
  notes,
}) {
  const appUrl = getAppUrl();
  return {
    subject: `Paper revision requested — ${conferenceTitle}`,
    html: wrapEmailTemplate({
      title: "Please revise your paper",
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>Your paper <strong>${paperTitle}</strong> for <strong>${conferenceTitle}</strong> needs revisions before it can be approved.</p>
        <p style="padding:12px 16px;background:#fff8e6;border-left:4px solid #d97706;"><strong>Requested improvements:</strong><br/>${improvementRequest}</p>
        ${notes ? `<p><strong>Additional comment:</strong> ${notes}</p>` : ""}
        <p>Sign in, open <strong>My papers</strong>, and resubmit your updated paper on the same submission record.</p>
      `,
      cta: { label: "View my papers", href: `${appUrl}/dashboard/my-papers` },
    }),
  };
}

export function paperApprovedEmail({ name, conferenceTitle, paperTitle, notes, isFinal }) {
  const appUrl = getAppUrl();
  const finalNote = isFinal
    ? "<p>This approval is <strong>final</strong> for this submission.</p>"
    : "";
  return {
    subject: `Paper approved — ${conferenceTitle}`,
    html: wrapEmailTemplate({
      title: "Paper approved",
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>Your paper <strong>${paperTitle}</strong> for <strong>${conferenceTitle}</strong> has been <strong>approved</strong>.</p>
        ${finalNote}
        ${notes ? `<p style="margin-top:16px;padding:12px 16px;background:#e8f5f0;border-left:4px solid ${brand.primary};"><strong>Comment:</strong><br/>${notes}</p>` : ""}
      `,
      cta: { label: "View my papers", href: `${appUrl}/dashboard/my-papers` },
    }),
  };
}

export function certificateIssuedEmail({
  name,
  conferenceTitle,
  certificateNumber,
  verifyUrl,
}) {
  const appUrl = getAppUrl();
  return {
    subject: `Your certificate of attendance — ${conferenceTitle}`,
    html: wrapEmailTemplate({
      title: "Certificate of attendance",
      preheader: `Certificate ${certificateNumber} for ${conferenceTitle}`,
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>Congratulations. Your <strong>Certificate of Attendance</strong> for <strong>${conferenceTitle}</strong> is attached to this email.</p>
        <p style="margin:16px 0;padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
          <strong>Certificate number:</strong><br/>
          <code style="font-size:14px;letter-spacing:0.5px;">${certificateNumber}</code>
        </p>
        <p>Anyone can confirm this certificate is genuine by scanning the QR code on the PDF or visiting the verification page.</p>
      `,
      cta: { label: "Verify certificate", href: verifyUrl || `${appUrl}/certificates/verify` },
    }),
  };
}

export function paperReviewerAssignedEmail({ name, conferenceTitle, paperTitle }) {
  const appUrl = getAppUrl();
  return {
    subject: `Paper assigned for review — ${conferenceTitle}`,
    html: wrapEmailTemplate({
      title: "New paper to review",
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>You have been assigned to review <strong>${paperTitle}</strong> for <strong>${conferenceTitle}</strong>.</p>
        <p>Sign in with your reviewer account to view the submission and submit your decision.</p>
      `,
      cta: { label: "Open assigned papers", href: `${appUrl}/dashboard/reviewer/papers` },
    }),
  };
}
