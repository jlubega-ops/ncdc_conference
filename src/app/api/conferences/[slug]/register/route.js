import { NextResponse } from "next/server";
import { savePrivateUpload } from "@/lib/storage/secure-files";
import { validateRegistrationForm } from "@/lib/registration/validation";
import { generateTemporaryPassword } from "@/lib/auth/credentials";
import {
  findExistingRegistration,
  getConferenceForRegistration,
  registerUserForConference,
  registrationConflictResponse,
} from "@/lib/registration/service";
import { mergeRegistrationWithProfile } from "@/lib/users/profile";

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
 */
async function savePaymentProof(file) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!ALLOWED_PROOF_TYPES.has(file.type)) {
    throw new Error("Payment proof must be a PDF, JPG, PNG, or WEBP file.");
  }
  if (file.size > MAX_PROOF_BYTES) {
    throw new Error("Payment proof must be 5MB or smaller.");
  }
  return savePrivateUpload(file, "payment-proofs");
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
          error: "Registration is not open for this conference.",
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

    const { user, registration } = await findExistingRegistration(raw.id, values.email);

    let finalValues = values;
    if (user) {
      finalValues = mergeRegistrationWithProfile(user, values);
      const { errors: revalidateErrors } = validateRegistrationForm(
        { ...finalValues, hasPaymentProof },
        { requiresPayment: Boolean(conference.requiresPayment), subThemes },
      );
      if (Object.keys(revalidateErrors).length > 0) {
        return NextResponse.json(
          { errors: revalidateErrors, error: "Please fix the highlighted fields." },
          { status: 400 },
        );
      }
    }

    if (registration) {
      const conflict = registrationConflictResponse({ conference, registration });
      return NextResponse.json(conflict.body, { status: conflict.status });
    }

    let paymentProofFileId = null;
    if (conference.requiresPayment) {
      paymentProofFileId = await savePaymentProof(paymentProofFile);
      if (!paymentProofFileId) {
        return NextResponse.json(
          { errors: { paymentProof: "Proof of payment is required." } },
          { status: 400 },
        );
      }
    }

    const isNewUser = !user;
    const tempPassword = isNewUser ? generateTemporaryPassword() : null;

    const result = await registerUserForConference({
      conference,
      conferenceId: raw.id,
      values: finalValues,
      paymentProofFileId,
      isNewUser,
      tempPassword,
    });

    const emailNote = result.emailSent
      ? ""
      : " We could not send the notification email — contact the organisers if you need sign-in help.";

    if (isNewUser) {
      return NextResponse.json({
        ok: true,
        isNewUser: true,
        emailSent: result.emailSent,
        message: `Registration received for ${conference.title}. Check your email for sign-in details. Your application is pending approval.${emailNote}`,
      });
    }

    return NextResponse.json({
      ok: true,
      isNewUser: false,
      emailSent: result.emailSent,
      redirect: "/login",
      message: `Application received for ${conference.title}. Sign in with your existing account to track your status.${emailNote}`,
    });
  } catch (err) {
    console.error("Conference registration error:", err);
    const message = err instanceof Error ? err.message : "Registration failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
