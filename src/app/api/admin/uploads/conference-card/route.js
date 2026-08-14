import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { requireConferenceManager } from "@/lib/auth/guards";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";
import { savePublicUpload } from "@/lib/storage/public-uploads";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request) {
  const session = await requireConferenceManager();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WEBP formats are allowed." },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image exceeds 5MB limit." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    const compressed = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const filename = `${Date.now()}-${randomUUID()}.webp`;
    const url = await savePublicUpload("conference-card-images", compressed, filename);
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.UPLOAD_CARD_IMAGE,
      description: "Uploaded conference card image",
      resourceType: "upload",
      metadata: { url },
    });

    return NextResponse.json({
      url,
      message: "Card image uploaded successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

