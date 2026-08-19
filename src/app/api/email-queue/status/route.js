import { NextResponse } from "next/server";
import { authorizeConferenceManager } from "@/lib/auth/guards";
import { getQueueJobStatus } from "@/lib/email-queue/service";

/**
 * GET /api/email-queue/status?jobId=...
 */
export async function GET(request) {
  const access = await authorizeConferenceManager();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  }

  try {
    const status = await getQueueJobStatus(jobId);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not get queue status." },
      { status: 500 },
    );
  }
}
