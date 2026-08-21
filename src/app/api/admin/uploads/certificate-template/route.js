import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { authorizeConferenceManager } from "@/lib/auth/guards";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";
import { savePublicUpload } from "@/lib/storage/public-uploads";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
/** A4 landscape in PDF points (297mm × 210mm), with small export tolerance. */
const A4_LANDSCAPE = { width: 841.89, height: 595.28 };
const SIZE_TOLERANCE = 12;

/**
 * @param {Buffer} buffer
 */
async function assertA4LandscapePdf(buffer) {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = doc.getPages();
  if (pages.length < 1) {
    throw new Error("PDF has no pages.");
  }
  const { width, height } = pages[0].getSize();
  if (width < height) {
    throw new Error("Certificate template must be A4 landscape (wider than tall).");
  }
  if (
    Math.abs(width - A4_LANDSCAPE.width) > SIZE_TOLERANCE ||
    Math.abs(height - A4_LANDSCAPE.height) > SIZE_TOLERANCE
  ) {
    throw new Error(
      `Certificate template must be A4 landscape (~${A4_LANDSCAPE.width.toFixed(0)}×${A4_LANDSCAPE.height.toFixed(0)} pt). This file is ${width.toFixed(0)}×${height.toFixed(0)} pt.`,
    );
  }
}

export async function POST(request) {
  const access = await authorizeConferenceManager();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !String(file.name || "").toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF templates are supported (A4 landscape)." },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "PDF exceeds 8MB limit." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await assertA4LandscapePdf(buffer);

    const filename = `${Date.now()}-${randomUUID()}.pdf`;
    const url = await savePublicUpload("certificate-templates", buffer, filename);

    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.UPLOAD_CERTIFICATE_TEMPLATE,
      description: "Uploaded certificate PDF template",
      resourceType: "upload",
      metadata: { url },
    });

    return NextResponse.json({
      url,
      message: "Certificate template uploaded. Save the conference to apply it.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Template upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
