import { prisma } from "@/lib/prisma";
import { findAttendanceMarks } from "@/lib/attendance/db";
import { computeAttendanceStats } from "@/lib/attendance/stats";
import { normalizeConferenceDays } from "@/lib/attendance/utils";
import { emailBrandFromConference } from "@/lib/conferences/brand";
import { mapConferenceForUi } from "@/lib/conferences/service";
import { getProfileFromUser } from "@/lib/users/profile";
import { sendEmail } from "@/lib/email/mailer";
import { certificateIssuedEmail } from "@/lib/email/templates";
import {
  certificateEligibilityMessage,
  isCertificateEligible,
  meetsCertificateAttendanceRules,
} from "@/lib/certificates/eligibility";
import {
  conferenceCodeFromSlug,
  formatCertificateNumber,
  generateCertificateSegment,
  isValidCertificateNumberFormat,
  normalizeCertificateNumberInput,
} from "@/lib/certificates/number";
import { buildCertificateVerifyUrl, renderCertificatePdf } from "@/lib/certificates/pdf";
import { readCachedCertificatePdf, writeCachedCertificatePdf, deleteCachedCertificatePdf } from "@/lib/certificates/pdf-cache";
import { withCertificatePdfSlot } from "@/lib/certificates/render-queue";
import { getCertificateEmailCooldown } from "@/lib/certificates/email-cooldown";
import { isCertificateEmailPending } from "@/lib/certificates/email-jobs";
import { isCertificateEmailRequestAllowed, isCertificatesAllowed, normalizeCertificateSettings } from "@/lib/certificates/settings";
import { getSmtpConfig } from "@/lib/email/config";

const MAX_NUMBER_ATTEMPTS = 8;

/**
 * @param {string} userId
 * @param {string} slug
 */
async function getRegistrationContext(userId, slug) {
  const registration = await prisma.conferenceRegistration.findFirst({
    where: {
      userId,
      status: "CONFIRMED",
      conference: { slug },
    },
    include: {
      conference: true,
      user: {
        select: { id: true, email: true, name: true, profileData: true },
      },
    },
  });

  if (!registration) {
    throw new Error("Approved registration not found for this conference.");
  }

  const days = normalizeConferenceDays(registration.conference.conferenceDays);
  if (!days.length) {
    throw new Error("This conference has no scheduled days for attendance tracking.");
  }

  const marks = await findAttendanceMarks(
    { userId, conferenceId: registration.conferenceId },
    { select: { dayDate: true } },
  );

  const tz = registration.conference.timezone || "Africa/Nairobi";
  const stats = computeAttendanceStats(days, marks, tz);
  const mapped = mapConferenceForUi(registration.conference);
  const profile = getProfileFromUser(registration.user);
  const recipientName = profile.fullName || registration.user.name || registration.user.email;

  return {
    registration,
    conference: mapped,
    rawConference: registration.conference,
    stats,
    recipientName,
    userEmail: registration.user.email,
  };
}

/**
 * @param {string} message
 * @param {number} status
 */
function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Fast checks before queueing a background certificate email.
 * @param {string} userId
 * @param {string} slug
 */
export async function assertCertificateCanBeEmailed(userId, slug) {
  const ctx = await getRegistrationContext(userId, slug);
  if (!isCertificateEmailRequestAllowed(ctx.conference)) {
    throw httpError(
      "Certificate email is not enabled for this conference. Please download the PDF instead.",
      403,
    );
  }
  const email = String(ctx.userEmail || "").trim();
  if (!email) {
    throw httpError("Your account has no email address. Download the PDF instead.", 400);
  }
  if (!isCertificateEligible(ctx.stats, ctx.conference)) {
    throw httpError(certificateEligibilityMessage(ctx.stats, ctx.conference), 400);
  }
  if (!getSmtpConfig()) {
    throw httpError(
      "Email sending is not available right now. Please download the PDF instead.",
      503,
    );
  }
  if (isCertificateEmailPending(userId, slug)) {
    throw httpError("Your certificate email is already being sent. Please wait a moment.", 409);
  }

  const existing = await prisma.conferenceCertificate.findFirst({
    where: { userId, conference: { slug } },
    select: { emailedAt: true },
  });
  const cooldown = getCertificateEmailCooldown(existing?.emailedAt);
  if (cooldown.blocked) {
    throw httpError(cooldown.message, 429);
  }

  return { email };
}

/**
 * @param {string} userId
 */
export async function getCertificateSummaries(userId) {
  const registrations = await prisma.conferenceRegistration.findMany({
    where: { userId, status: "CONFIRMED" },
    include: { conference: true },
    orderBy: { registeredAt: "desc" },
  });

  const conferenceIds = registrations.map((r) => r.conferenceId);
  const [marks, existingCerts] = await Promise.all([
    conferenceIds.length
      ? findAttendanceMarks(
          { userId, conferenceId: { in: conferenceIds } },
          { select: { conferenceId: true, dayDate: true } },
        )
      : [],
    conferenceIds.length
      ? prisma.conferenceCertificate.findMany({
          where: { userId, conferenceId: { in: conferenceIds } },
        })
      : [],
  ]);

  const marksByConference = new Map();
  for (const m of marks) {
    if (!marksByConference.has(m.conferenceId)) marksByConference.set(m.conferenceId, []);
    marksByConference.get(m.conferenceId).push(m);
  }

  const certByConference = new Map(existingCerts.map((c) => [c.conferenceId, c]));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, profileData: true },
  });
  const recipientName =
    getProfileFromUser(user).fullName || user?.name || user?.email || "";

  return registrations.map((reg) => {
    const days = normalizeConferenceDays(reg.conference.conferenceDays);
    const tz = reg.conference.timezone || "Africa/Nairobi";
    const conferenceMarks = marksByConference.get(reg.conferenceId) ?? [];
    const stats = computeAttendanceStats(days, conferenceMarks, tz);
    const mapped = mapConferenceForUi(reg.conference);
    const eligible = isCertificateEligible(stats, mapped);
    const cert = certByConference.get(reg.conferenceId);
    const conferenceEnded =
      mapped.status === "completed" ||
      (stats.remaining === 0 && stats.elapsed >= stats.totalDays && stats.totalDays > 0);

    const cooldown = getCertificateEmailCooldown(cert?.emailedAt);
    const emailAllowed = isCertificateEmailRequestAllowed(mapped);
    const message = !eligible
      ? certificateEligibilityMessage(stats, mapped)
      : cert
        ? "Your certificate has been issued."
        : certificateEligibilityMessage(stats, mapped);

    return {
      conference: {
        slug: mapped.slug,
        title: mapped.title,
        cardImage: mapped.cardImage,
        dateRange: mapped.dateRange,
        lifecycleStatus: mapped.status,
        certificateSettings: mapped.certificateSettings,
      },
      stats,
      eligible,
      conferenceEnded,
      recipientName,
      allowEmailRequest: emailAllowed,
      canEmail: Boolean(eligible && emailAllowed && !cooldown.blocked),
      nextEmailAt: cooldown.retryAt ? cooldown.retryAt.toISOString() : null,
      emailCooldownMessage: emailAllowed ? cooldown.message : null,
      certificate: cert
        ? {
            id: cert.id,
            certificateNumber: cert.certificateNumber,
            issuedAt: cert.issuedAt,
            emailedAt: cert.emailedAt,
            recipientName: cert.recipientName,
          }
        : null,
      message,
    };
  });
}

/**
 * @param {import("@prisma/client").Conference} conference
 * @param {string} recipientName
 * @param {ReturnType<typeof computeAttendanceStats>} stats
 */
async function createCertificateRecord(conference, userId, recipientName, stats) {
  const year =
    conference.startDate?.getFullYear() ??
    new Date().getFullYear();
  const conferenceCode = conferenceCodeFromSlug(conference.slug);

  for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt += 1) {
    const segment = generateCertificateSegment(8);
    const certificateNumber = formatCertificateNumber({
      year,
      conferenceCode,
      segment,
    });

    try {
      return await prisma.conferenceCertificate.create({
        data: {
          certificateNumber,
          conferenceId: conference.id,
          userId,
          recipientName,
          attendancePercent: stats.overallProgress,
          daysAttended: stats.attended,
          totalDays: stats.totalDays,
        },
        include: {
          conference: true,
        },
      });
    } catch (err) {
      if (err?.code === "P2002") continue;
      throw err;
    }
  }

  throw new Error("Could not generate a unique certificate number. Please try again.");
}

/**
 * @param {string} userId
 * @param {string} slug
 * @param {{ sendEmail?: boolean }} [opts]
 */
export async function issueCertificateForUser(userId, slug, opts = {}) {
  const ctx = await getRegistrationContext(userId, slug);

  if (!meetsCertificateAttendanceRules(ctx.stats, ctx.conference)) {
    throw new Error(certificateEligibilityMessage(ctx.stats, ctx.conference));
  }

  let cert = await prisma.conferenceCertificate.findUnique({
    where: {
      conferenceId_userId: {
        conferenceId: ctx.registration.conferenceId,
        userId,
      },
    },
    include: { conference: true },
  });

  if (!cert) {
    cert = await createCertificateRecord(
      ctx.rawConference,
      userId,
      ctx.recipientName,
      ctx.stats,
    );
  } else if (cert.recipientName !== ctx.recipientName) {
    cert = await prisma.conferenceCertificate.update({
      where: { id: cert.id },
      data: { recipientName: ctx.recipientName },
      include: { conference: true },
    });
    await deleteCachedCertificatePdf(cert.id);
  }

  const shouldEmail = Boolean(opts.sendEmail);
  if (shouldEmail && !cert.emailedAt) {
    try {
      await sendCertificateEmail(cert, ctx.userEmail);
      cert = await prisma.conferenceCertificate.update({
        where: { id: cert.id },
        data: { emailedAt: new Date() },
        include: { conference: true },
      });
    } catch (err) {
      console.warn("[certificate] Auto-email failed:", err);
    }
  }

  return cert;
}

/**
 * @param {any} cert
 * @param {string} toEmail
 */
async function sendCertificateEmail(cert, toEmail) {
  const pdfBuffer = await buildCertificatePdfBuffer(cert);
  const verifyUrl = buildCertificateVerifyUrl(cert.certificateNumber);
  const mapped = mapConferenceForUi(cert.conference);

  const emailPayload = certificateIssuedEmail({
    name: cert.recipientName,
    conferenceTitle: mapped.title,
    certificateNumber: cert.certificateNumber,
    verifyUrl,
    brand: emailBrandFromConference(mapped),
  });

  const result = await sendEmail({
    to: toEmail,
    ...emailPayload,
    attachments: [
      {
        filename: `NCDC-Certificate-${cert.certificateNumber.replace(/\//g, "-")}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  if (!result.ok && !result.skipped) {
    throw new Error(result.error || "Could not send certificate email.");
  }

  return result;
}

/**
 * @param {any} cert
 */
async function buildCertificatePdfBuffer(cert) {
  const cached = await readCachedCertificatePdf(cert.id);
  if (cached) return cached;

  const mapped = mapConferenceForUi(cert.conference);
  const verifyUrl = buildCertificateVerifyUrl(cert.certificateNumber);

  const buffer = await withCertificatePdfSlot(() =>
    renderCertificatePdf({
      recipientName: cert.recipientName,
      conferenceTitle: mapped.title,
      conferenceTheme: mapped.theme || null,
      dateRange: mapped.dateRange || null,
      attendancePercent: cert.attendancePercent,
      daysAttended: cert.daysAttended,
      totalDays: cert.totalDays,
      certificateNumber: cert.certificateNumber,
      issuedAt: cert.issuedAt,
      verifyUrl,
      organiserName: mapped.organiserName,
      organiserShortName: mapped.organiserShortName,
      organiserLogo: mapped.organiserLogo,
      certificateSettings: mapped.certificateSettings,
    }),
  );

  await writeCachedCertificatePdf(cert.id, buffer).catch(() => {
    /* cache is optional — still return the PDF */
  });
  return buffer;
}

/**
 * @param {string} userId
 * @param {string} slug
 * @param {{ markDownloaded?: boolean }} [opts]
 */
export async function getCertificatePdfForUser(userId, slug, opts = {}) {
  const markDownloaded = opts.markDownloaded !== false;
  const ctx = await getRegistrationContext(userId, slug);
  if (!isCertificateEligible(ctx.stats, ctx.conference)) {
    throw new Error(certificateEligibilityMessage(ctx.stats, ctx.conference));
  }

  await issueCertificateForUser(userId, slug, { sendEmail: false });
  const cert = await prisma.conferenceCertificate.findFirst({
    where: {
      userId,
      conference: { slug },
    },
    include: { conference: true },
  });
  if (!cert) throw new Error("Certificate not found.");
  const buffer = await buildCertificatePdfBuffer(cert);
  if (markDownloaded) {
    await prisma.conferenceCertificate
      .update({
        where: { id: cert.id },
        data: { downloadedAt: new Date() },
      })
      .catch(() => {});
  }
  const filename = `NCDC-Certificate-${cert.certificateNumber.replace(/\//g, "-")}.pdf`;
  return { buffer, filename, certificateNumber: cert.certificateNumber };
}

/**
 * @param {string} userId
 * @param {string} slug
 */
export async function emailCertificateToUser(userId, slug) {
  const ctx = await getRegistrationContext(userId, slug);
  if (!isCertificateEmailRequestAllowed(ctx.conference)) {
    throw httpError(
      "Certificate email is not enabled for this conference. Please download the PDF instead.",
      403,
    );
  }
  const toEmail = String(ctx.userEmail || "").trim();
  if (!toEmail) {
    throw httpError("Your account has no email address. Download the PDF instead.", 400);
  }
  if (!isCertificateEligible(ctx.stats, ctx.conference)) {
    throw httpError(certificateEligibilityMessage(ctx.stats, ctx.conference), 400);
  }

  const cert = await issueCertificateForUser(userId, slug, { sendEmail: false });
  const cooldown = getCertificateEmailCooldown(cert.emailedAt);
  if (cooldown.blocked) {
    throw httpError(cooldown.message, 429);
  }

  let result;
  try {
    result = await sendCertificateEmail(cert, toEmail);
  } catch (err) {
    console.error("[certificate] Email send failed:", err);
    throw httpError(
      `We could not send the certificate to ${toEmail}. Please try again. If it keeps failing, download the PDF instead.`,
      502,
    );
  }

  if (!result.ok) {
    throw httpError(
      result.skipped
        ? "Email sending is not available right now. Please download the PDF instead."
        : `We could not send the certificate to ${toEmail}. Please try again. If it keeps failing, download the PDF instead.`,
      result.skipped ? 503 : 502,
    );
  }

  await prisma.conferenceCertificate.update({
    where: { id: cert.id },
    data: { emailedAt: new Date() },
  });

  return {
    ok: true,
    skipped: false,
    message: `Certificate sent to ${toEmail}. You can email it again after 24 hours. Download is unlimited.`,
  };
}

/**
 * When a person's name is corrected, drop cached PDFs so the next download reprints.
 * @param {string} userId
 */
export async function invalidateCertificatePdfsForUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, profileData: true },
  });
  if (!user) return;

  const recipientName = getProfileFromUser(user).fullName || user.name || user.email;
  const certs = await prisma.conferenceCertificate.findMany({
    where: { userId },
    select: { id: true, recipientName: true },
  });

  await Promise.all(
    certs.map(async (cert) => {
      if (cert.recipientName !== recipientName) {
        await prisma.conferenceCertificate.update({
          where: { id: cert.id },
          data: { recipientName },
        });
      }
      await deleteCachedCertificatePdf(cert.id);
    }),
  );
}

/**
 * Drop all cached certificate PDFs for a conference (e.g. after template change).
 * @param {string} conferenceId
 */
export async function invalidateCertificatePdfsForConference(conferenceId) {
  const certs = await prisma.conferenceCertificate.findMany({
    where: { conferenceId },
    select: { id: true },
  });
  await Promise.all(certs.map((cert) => deleteCachedCertificatePdf(cert.id)));
}

/**
 * Admin roster: issued certificates + eligible confirmed attendees without one yet.
 * @param {string} conferenceId
 */
export async function listConferenceCertificatesForAdmin(conferenceId) {
  const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
  if (!conference) throw new Error("Conference not found.");

  const mapped = mapConferenceForUi(conference);
  if (!isCertificatesAllowed(mapped)) {
    throw new Error("Certificates are not enabled for this conference.");
  }

  const days = normalizeConferenceDays(conference.conferenceDays);
  const tz = conference.timezone || "Africa/Nairobi";

  const [registrations, certificates, marks] = await Promise.all([
    prisma.conferenceRegistration.findMany({
      where: { conferenceId, status: "CONFIRMED" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profileData: true,
            roles: {
              select: { role: true, conferenceId: true },
            },
          },
        },
      },
      orderBy: { registeredAt: "desc" },
    }),
    prisma.conferenceCertificate.findMany({
      where: { conferenceId },
      orderBy: { issuedAt: "desc" },
    }),
    days.length
      ? findAttendanceMarks(
          { conferenceId },
          { select: { userId: true, dayDate: true } },
        )
      : [],
  ]);

  const certByUser = new Map(certificates.map((c) => [c.userId, c]));
  const marksByUser = new Map();
  for (const m of marks) {
    if (!marksByUser.has(m.userId)) marksByUser.set(m.userId, []);
    marksByUser.get(m.userId).push(m);
  }

  const settings = normalizeCertificateSettings(mapped.certificateSettings, {
    totalDays: days.length || 1,
  });

  const rows = registrations.map((reg) => {
    const userMarks = marksByUser.get(reg.userId) ?? [];
    const stats = computeAttendanceStats(days, userMarks, tz);
    const eligible = isCertificateEligible(stats, mapped);
    const cert = certByUser.get(reg.userId) ?? null;
    const profile = getProfileFromUser(reg.user);
    const roleSet = new Set();
    for (const r of reg.user.roles || []) {
      if (r.role === "SUPERADMIN") roleSet.add("SUPERADMIN");
      else if (!r.conferenceId || r.conferenceId === conferenceId) roleSet.add(r.role);
    }
    if (roleSet.size === 0) roleSet.add("ATTENDEE");

    return {
      userId: reg.userId,
      email: reg.user.email,
      name: profile.fullName || reg.user.name || reg.user.email,
      roles: [...roleSet],
      eligible,
      stats: {
        attended: stats.attended,
        totalDays: stats.totalDays,
        missed: stats.missed,
        remaining: stats.remaining,
      },
      certificate: cert
        ? {
            id: cert.id,
            certificateNumber: cert.certificateNumber,
            recipientName: cert.recipientName,
            issuedAt: cert.issuedAt,
            downloadedAt: cert.downloadedAt,
            emailedAt: cert.emailedAt,
            attendancePercent: cert.attendancePercent,
            daysAttended: cert.daysAttended,
            totalDays: cert.totalDays,
          }
        : null,
    };
  });

  // Sort: issued first (by issuedAt desc), then eligible without cert, then others
  rows.sort((a, b) => {
    const aIssued = a.certificate?.issuedAt ? new Date(a.certificate.issuedAt).getTime() : 0;
    const bIssued = b.certificate?.issuedAt ? new Date(b.certificate.issuedAt).getTime() : 0;
    if (aIssued && bIssued) return bIssued - aIssued;
    if (aIssued) return -1;
    if (bIssued) return 1;
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  const summary = {
    confirmed: rows.length,
    eligible: rows.filter((r) => r.eligible).length,
    issued: rows.filter((r) => r.certificate).length,
    downloaded: rows.filter((r) => r.certificate?.downloadedAt).length,
    emailed: rows.filter((r) => r.certificate?.emailedAt).length,
    allowEmailRequest: settings.allowEmailRequest,
  };

  return { rows, summary, conference: { id: mapped.id, slug: mapped.slug, title: mapped.title } };
}

/**
 * Admin download — issues if needed, serves cached PDF when possible, marks downloadedAt.
 * @param {string} conferenceId
 * @param {string} userId
 */
export async function getCertificatePdfForAdmin(conferenceId, userId) {
  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { slug: true, certificateSettings: true, conferenceDays: true },
  });
  if (!conference) throw new Error("Conference not found.");
  if (!isCertificatesAllowed(conference)) {
    throw new Error("Certificates are not enabled for this conference.");
  }

  const result = await getCertificatePdfForUser(userId, conference.slug, {
    markDownloaded: false,
  });
  return result;
}

/**
 * Admin email to attendee — bypasses the public "allow email request" toggle.
 * Still requires eligibility. Uses cached PDF when available.
 * @param {string} conferenceId
 * @param {string} userId
 */
export async function emailCertificateForAdmin(conferenceId, userId) {
  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { slug: true, certificateSettings: true },
  });
  if (!conference) throw new Error("Conference not found.");
  if (!isCertificatesAllowed(conference)) {
    throw new Error("Certificates are not enabled for this conference.");
  }

  const ctx = await getRegistrationContext(userId, conference.slug);
  const toEmail = String(ctx.userEmail || "").trim();
  if (!toEmail) {
    throw httpError("This attendee has no email address.", 400);
  }
  if (!isCertificateEligible(ctx.stats, ctx.conference)) {
    throw httpError(certificateEligibilityMessage(ctx.stats, ctx.conference), 400);
  }

  const cert = await issueCertificateForUser(userId, conference.slug, { sendEmail: false });
  const result = await sendCertificateEmail(cert, toEmail);
  if (!result.ok) {
    throw httpError(
      result.skipped
        ? "Email sending is not available right now."
        : `Could not send certificate to ${toEmail}.`,
      result.skipped ? 503 : 502,
    );
  }

  await prisma.conferenceCertificate.update({
    where: { id: cert.id },
    data: { emailedAt: new Date() },
  });

  return {
    ok: true,
    email: toEmail,
    message: `Certificate emailed to ${toEmail}.`,
  };
}

/**
 * @param {string} rawNumber
 */
export async function verifyCertificateByNumber(rawNumber) {
  const certificateNumber = normalizeCertificateNumberInput(rawNumber);

  if (!certificateNumber) {
    return { valid: false, error: "Enter a certificate number." };
  }

  if (!isValidCertificateNumberFormat(certificateNumber)) {
    return {
      valid: false,
      error:
        "Invalid format. Use NCDC/YEAR/CONF/XXXXXXXX (8-character code, letters and numbers only).",
    };
  }

  const cert = await prisma.conferenceCertificate.findUnique({
    where: { certificateNumber },
    include: { conference: true },
  });

  if (!cert) {
    return { valid: false, error: "No certificate found with this number." };
  }

  const mapped = mapConferenceForUi(cert.conference);

  return {
    valid: true,
    certificate: {
      certificateNumber: cert.certificateNumber,
      recipientName: cert.recipientName,
      conferenceTitle: mapped.title,
      dateRange: mapped.dateRange || null,
      attendancePercent: cert.attendancePercent,
      daysAttended: cert.daysAttended,
      totalDays: cert.totalDays,
      issuedAt: cert.issuedAt,
      organiserName: mapped.organiserName || null,
      organiserShortName: mapped.organiserShortName || null,
      organiserLogo: mapped.organiserLogo || null,
    },
    brand: {
      name: mapped.organiserName || mapped.title,
      shortName: mapped.organiserShortName || "",
      logo: mapped.organiserLogo || "",
    },
  };
}
