import { NextResponse } from "next/server";
import { guessMimeType } from "@/lib/storage/secure-files";
import { readPublicUpload } from "@/lib/storage/public-uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { path: segments } = await params;
  const parts = Array.isArray(segments) ? segments : [];
  if (parts.length !== 2) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const [category, filename] = parts;
  try {
    const buffer = await readPublicUpload(category, filename);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": guessMimeType(filename),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
