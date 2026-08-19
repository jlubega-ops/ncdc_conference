import { getAppUrl } from "@/lib/email/config";

const palette = {
  primary: "#1a5f4a",
  primaryLight: "#e8f5f0",
  text: "#1a1a1a",
  muted: "#5c5c5c",
};

/**
 * @param {{
 *   title: string,
 *   preheader?: string,
 *   bodyHtml: string,
 *   cta?: { label: string, href: string },
 *   brand?: { name?: string, shortName?: string, logoUrl?: string, footerLine?: string } | null,
 * }} opts
 */
export function wrapEmailTemplate({ title, preheader, bodyHtml, cta, brand: orgBrand }) {
  const appUrl = getAppUrl();
  const logoUrl = orgBrand?.logoUrl || `${appUrl}/assets/logo.png`;
  const logoAlt = orgBrand?.name || "Conference";
  const footerLine =
    orgBrand?.footerLine ||
    "National Curriculum Development Centre (NCDC) · Conference Platform";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:${palette.text};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:${palette.primary};padding:24px 28px;">
              <img src="${logoUrl}" alt="${logoAlt}" width="120" style="display:block;border-radius:6px;background:#fff;padding:4px;max-height:64px;width:auto;" />
              ${orgBrand?.name ? `<p style="margin:10px 0 0;font-size:13px;color:#ffffff;opacity:0.95;">${orgBrand.name}${orgBrand.shortName ? ` · ${orgBrand.shortName}` : ""}</p>` : ""}
              <h1 style="margin:12px 0 0;font-size:20px;font-weight:600;color:#ffffff;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-size:15px;line-height:1.6;color:${palette.text};">
              ${bodyHtml}
              ${
                cta
                  ? `<p style="margin:28px 0 0;"><a href="${cta.href}" style="display:inline-block;background:${palette.primary};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${cta.label}</a></p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:${palette.primaryLight};font-size:12px;color:${palette.muted};border-top:1px solid #e5e7eb;">
              ${footerLine}<br />
              <a href="${appUrl}" style="color:${palette.primary};">${appUrl}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function registrationWelcomeEmail({ name, email, password, conferenceTitle, brand }) {
  const appUrl = getAppUrl();
  return {
    subject: `Your account — ${conferenceTitle}`,
    fromName: brand?.name,
    html: wrapEmailTemplate({
      title: "Registration received",
      preheader: `Sign in with your new account for ${conferenceTitle}`,
      brand,
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

export function registrationReceivedEmail({ name, conferenceTitle, brand }) {
  const appUrl = getAppUrl();
  return {
    subject: `Application received — ${conferenceTitle}`,
    fromName: brand?.name,
    html: wrapEmailTemplate({
      title: "Registration received",
      brand,
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>Thank you for registering for <strong>${conferenceTitle}</strong>.</p>
        <p>Your application is <strong>pending approval</strong>. You will receive an access code by email once an administrator approves your registration.</p>
      `,
      cta: { label: "Browse conferences", href: `${appUrl}/conferences` },
    }),
  };
}

export function registrationExistingAccountEmail({ name, conferenceTitle, brand }) {
  const appUrl = getAppUrl();
  return {
    subject: `Application received — ${conferenceTitle}`,
    fromName: brand?.name,
    html: wrapEmailTemplate({
      title: "Conference application submitted",
      brand,
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>We received your application for <strong>${conferenceTitle}</strong> (pending approval).</p>
        <p>You will receive an access code by email once an administrator approves your registration. You can register for multiple conferences with the same email.</p>
      `,
      cta: { label: "Browse conferences", href: `${appUrl}/conferences` },
    }),
  };
}

export function registrationApprovedEmail({ name, conferenceTitle, notes, conferenceSlug, brand }) {
  const appUrl = getAppUrl();
  const notesBlock = notes
    ? `<p style="margin-top:16px;padding:12px 16px;background:#e8f5f0;border-left:4px solid ${palette.primary};"><strong>Note from the organisers:</strong><br/>${notes}</p>`
    : "";
  return {
    subject: `Approved — ${conferenceTitle}`,
    fromName: brand?.name,
    html: wrapEmailTemplate({
      title: "Registration approved",
      brand,
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>Your registration for <strong>${conferenceTitle}</strong> has been <strong>approved</strong>.</p>
        <p>An access code has been sent in a separate email (or below if combined). Use the access code sign-in page to open your conference.</p>
        ${notesBlock}
      `,
      cta: { label: "Sign in with access code", href: `${appUrl}/access` },
    }),
  };
}

export function registrationRevisionEmail({ name, conferenceTitle, improvementRequest, notes, brand }) {
  const appUrl = getAppUrl();
  return {
    subject: `Action required — ${conferenceTitle}`,
    fromName: brand?.name,
    html: wrapEmailTemplate({
      title: "Please update your registration",
      brand,
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

/**
 * @param {{
 *   name: string;
 *   email: string;
 *   password?: string;
 *   isUpgrade?: boolean;
 *   isReset?: boolean;
 * }} opts
 */
export function accountWelcomeEmail({ name, email, password, isUpgrade = false, isReset = false }) {
  const appUrl = getAppUrl();
  const loginUrl = `${appUrl}/login`;

  let title = "Account created";
  let preheader = "Sign in and set your password";
  let intro = `<p>An administrator created an account for you on the Conference Platform.</p>`;

  if (isReset) {
    title = "Password reset";
    preheader = "Your password was reset by an administrator";
    intro = `<p>An administrator has reset your password. Use the temporary password below to sign in, then set a new password.</p>`;
  } else if (isUpgrade) {
    title = "Staff access granted";
    preheader = "You have been given staff access to the Conference Platform";
    intro = `<p>An administrator has granted you staff access to the Conference Platform.</p>${
      password
        ? `<p>A temporary password has been set. Please sign in and change it immediately.</p>`
        : `<p>Use your existing password to sign in at the link below.</p>`
    }`;
  }

  const credRows = [
    `<tr><td style="padding:12px 16px;"><strong>Email (username):</strong><br/>${email}</td></tr>`,
    ...(password
      ? [
          `<tr><td style="padding:12px 16px;border-top:1px solid #e5e7eb;"><strong>Temporary password:</strong><br/><code style="font-size:16px;letter-spacing:1px;">${password}</code></td></tr>`,
        ]
      : []),
    `<tr><td style="padding:12px 16px;border-top:1px solid #e5e7eb;"><strong>System login:</strong><br/><a href="${loginUrl}" style="color:#008e51;word-break:break-all;">${loginUrl}</a></td></tr>`,
  ].join("");

  return {
    subject: isReset
      ? "Your conference platform password was reset"
      : isUpgrade
        ? "Staff access granted — Conference Platform"
        : "Your conference platform account",
    html: wrapEmailTemplate({
      title,
      preheader,
      bodyHtml: `
        <p>Hello ${name},</p>
        ${intro}
        <table style="margin:20px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;width:100%;">
          ${credRows}
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
  brand,
}) {
  const appUrl = getAppUrl();
  return {
    subject: `Paper revision requested — ${conferenceTitle}`,
    fromName: brand?.name,
    html: wrapEmailTemplate({
      title: "Please revise your paper",
      brand,
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

export function paperApprovedEmail({ name, conferenceTitle, paperTitle, notes, isFinal, brand }) {
  const appUrl = getAppUrl();
  const finalNote = isFinal
    ? "<p>This approval is <strong>final</strong> for this submission.</p>"
    : "";
  return {
    subject: `Paper approved — ${conferenceTitle}`,
    fromName: brand?.name,
    html: wrapEmailTemplate({
      title: "Paper approved",
      brand,
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>Your paper <strong>${paperTitle}</strong> for <strong>${conferenceTitle}</strong> has been <strong>approved</strong>.</p>
        ${finalNote}
        ${notes ? `<p style="margin-top:16px;padding:12px 16px;background:#e8f5f0;border-left:4px solid ${palette.primary};"><strong>Comment:</strong><br/>${notes}</p>` : ""}
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
  brand,
}) {
  const appUrl = getAppUrl();
  return {
    subject: `Your certificate of attendance — ${conferenceTitle}`,
    fromName: brand?.name,
    html: wrapEmailTemplate({
      title: "Certificate of attendance",
      preheader: `Certificate ${certificateNumber} for ${conferenceTitle}`,
      brand,
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

export function paperReviewerAssignedEmail({ name, conferenceTitle, paperTitle, brand }) {
  const appUrl = getAppUrl();
  return {
    subject: `Paper assigned for review — ${conferenceTitle}`,
    fromName: brand?.name,
    html: wrapEmailTemplate({
      title: "New paper to review",
      brand,
      bodyHtml: `
        <p>Hello ${name},</p>
        <p>You have been assigned to review <strong>${paperTitle}</strong> for <strong>${conferenceTitle}</strong>.</p>
        <p>Sign in with your reviewer account to view the submission and submit your decision.</p>
      `,
      cta: { label: "Open assigned papers", href: `${appUrl}/dashboard/reviewer/papers` },
    }),
  };
}
