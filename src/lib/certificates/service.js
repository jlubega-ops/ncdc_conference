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
      canEmail: Boolean(eligible && !cooldown.blocked),
      nextEmailAt: cooldown.retryAt ? cooldown.retryAt.toISOString() : null,
      emailCooldownMessage: cooldown.message,
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
 */
export async function getCertificatePdfForUser(userId, slug) {
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
  const filename = `NCDC-Certificate-${cert.certificateNumber.replace(/\//g, "-")}.pdf`;
  return { buffer, filename, certificateNumber: cert.certificateNumber };
}

/**
 * @param {string} userId
 * @param {string} slug
 */
export async function emailCertificateToUser(userId, slug) {
  const ctx = await getRegistrationContext(userId, slug);
  if (!isCertificateEligible(ctx.stats, ctx.conference)) {
    throw new Error(certificateEligibilityMessage(ctx.stats, ctx.conference));
  }

  const cert = await issueCertificateForUser(userId, slug, { sendEmail: false });
  const cooldown = getCertificateEmailCooldown(cert.emailedAt);
  if (cooldown.blocked) {
    const error = new Error(cooldown.message);
    error.status = 429;
    throw error;
  }

  const result = await sendCertificateEmail(cert, ctx.userEmail);

  if (result.ok) {
    await prisma.conferenceCertificate.update({
      where: { id: cert.id },
      data: { emailedAt: new Date() },
    });
  }

  return {
    ok: result.ok,
    skipped: result.skipped,
    message: result.ok
      ? `Certificate sent to ${ctx.userEmail}. You can email it again after 24 hours. Download is unlimited.`
      : result.skipped
        ? "SMTP is not configured. Download the PDF instead."
        : result.error,
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
