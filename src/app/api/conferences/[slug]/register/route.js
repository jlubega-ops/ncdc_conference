import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRegistrationForm } from "@/lib/registration/validation";
import {
  findExistingRegistration,
  getConferenceForRegistration,
  registrationConflictResponse,
} from "@/lib/registration/service";

export const runtime = "nodejs";

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * @param {File} file
 * @param {string} conferenceId
 */
async function savePaymentProof(file, conferenceId) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!ALLOWED_PROOF_TYPES.has(file.type)) {
    throw new Error("Payment proof must be a PDF, JPG, PNG, or WEBP file.");
  }
  if (file.size > MAX_PROOF_BYTES) {
    throw new Error("Payment proof must be 5MB or smaller.");
  }

  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";

  const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-proofs", conferenceId);
  await mkdir(uploadDir, { recursive: true });
  const filename = `${Date.now()}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/payment-proofs/${conferenceId}/${filename}`;
}

export async function POST(request, { params }) {
  try {
    const { slug } = await params;
    const ctx = await getConferenceForRegistration(slug);

    if (!ctx) {
      return NextResponse.json({ error: "Conference not found." }, { status: 404 });
    }
    if (!ctx.registrable) {
      return NextResponse.json(
        {
          error:
            "Registration is only open for upcoming or currently running conferences.",
          code: "CONFERENCE_CLOSED",
        },
        { status: 400 },
      );
    }

    const { conference, raw } = ctx;
    const subThemes = Array.isArray(conference.subThemes) ? conference.subThemes : [];
    const form = await request.formData();

    let subThemesSelected = [];
    const subThemesRaw = form.get("subThemes");
    if (typeof subThemesRaw === "string" && subThemesRaw) {
      try {
        subThemesSelected = JSON.parse(subThemesRaw);
      } catch {
        subThemesSelected = [];
      }
    }

    const paymentProofFile = form.get("paymentProof");
    const hasPaymentProof =
      paymentProofFile instanceof File && paymentProofFile.size > 0;

    const payload = {
      firstName: form.get("firstName"),
      middleName: form.get("middleName"),
      lastName: form.get("lastName"),
      email: form.get("email"),
      gender: form.get("gender"),
      ageRange: form.get("ageRange"),
      countryCode: form.get("countryCode"),
      telephone: form.get("telephone"),
      countryOfOrigin: form.get("countryOfOrigin"),
      institution: form.get("institution"),
      attendanceMode: form.get("attendanceMode"),
      subThemes: subThemesSelected,
      expectations: form.get("expectations"),
      postConferenceEvents: form.get("postConferenceEvents"),
      hasDisability: form.get("hasDisability"),
      disabilityDetails: form.get("disabilityDetails"),
      hasPaymentProof,
    };

    const { errors, values } = validateRegistrationForm(payload, {
      requiresPayment: Boolean(conference.requiresPayment),
      subThemes,
    });

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors, error: "Please fix the highlighted fields." }, { status: 400 });
    }

    const staffRoles = ["SUPERADMIN", "CONFERENCE_ADMIN", "REVIEWER"];
    let { user, registration } = await findExistingRegistration(raw.id, values.email);

    if (user?.roles.some((r) => staffRoles.includes(r.role))) {
      return NextResponse.json(
        {
          error: "This email is registered as staff. Use staff sign-in instead.",
          code: "STAFF_ACCOUNT",
        },
        { status: 400 },
      );
    }

    if (registration) {
      const conflict = registrationConflictResponse({
        conference: raw,
        registration,
        mapped: conference,
      });
      return NextResponse.json(conflict.body, { status: conflict.status });
    }

    let paymentProofUrl = null;
    if (conference.requiresPayment) {
      paymentProofUrl = await savePaymentProof(paymentProofFile, raw.id);
      if (!paymentProofUrl) {
        return NextResponse.json(
          { errors: { paymentProof: "Proof of payment is required." } },
          { status: 400 },
        );
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: values.email,
          name: values.fullName,
        },
        include: { roles: true },
      });
    } else if (!user.name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: values.fullName },
        include: { roles: true },
      });
    }

    await prisma.conferenceRegistration.create({
      data: {
        conferenceId: raw.id,
        userId: user.id,
        status: "PENDING",
        paymentStatus: conference.requiresPayment ? "pending_verification" : null,
        paymentProofUrl,
        formData: values,
      },
    });

    const hasAttendee = user.roles.some(
      (r) => r.role === "ATTENDEE" && r.conferenceId === raw.id,
    );
    if (!hasAttendee) {
      await prisma.userRole.create({
        data: { userId: user.id, role: "ATTENDEE", conferenceId: raw.id },
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Registration received for ${conference.title}. You will be notified by email once your application is approved.`,
    });
  } catch (err) {
    console.error("Conference registration error:", err);
    const message = err instanceof Error ? err.message : "Registration failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
