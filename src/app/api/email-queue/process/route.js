import { NextResponse } from "next/server";
import { authorizeConferenceManager } from "@/lib/auth/guards";
import { processEmailQueue } from "@/lib/email-queue/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

/**
 * POST /api/email-queue/process
 * Body: { jobId?: string; force?: boolean }
 *
 * Processes up to QUEUE_BATCH_SIZE pending emails.
 * Respects the 5-minute cool-down unless force=true.
 */
export async function POST(request) {
  const access = await authorizeConferenceManager();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  let body = {};
  try { body = await request.json(); } catch { /* no body */ }

  const { jobId, force = false } = body;

  try {
    const result = await processEmailQueue({ jobId, force });

    if (result.processed > 0) {
      await logActivity({
        session,
        request,
        action: ACTIVITY_ACTIONS.EMAIL_QUEUE_PROCESS,
        description: `Email queue batch: ${result.sent} sent, ${result.failed} failed. ${result.remaining} remaining.`,
        conferenceId: null,
        metadata: { jobId, ...result },
      });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Queue processing failed." },
      { status: 500 },
    );
  }
}
