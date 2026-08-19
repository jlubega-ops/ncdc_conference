import { NextResponse } from "next/server";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import { enqueueAccessCodeEmails, processEmailQueue, QUEUE_BATCH_SIZE } from "@/lib/email-queue/service";
import { sendAccessCodesBulk } from "@/lib/registration/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function POST(request, { params }) {
  const { id: conferenceId } = await params;
  const access = await authorizeConferenceAccess(conferenceId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const registrationIds = Array.isArray(body.registrationIds) ? body.registrationIds : [];

  try {
    // Small sends (≤ QUEUE_BATCH_SIZE): send immediately as before — no overhead.
    if (registrationIds.length <= QUEUE_BATCH_SIZE) {
      const results = await sendAccessCodesBulk({ conferenceId, registrationIds });

      if (!body.silent) {
        await logActivity({
          session,
          request,
          action: ACTIVITY_ACTIONS.REGISTRATION_BULK_SEND_ACCESS,
          description: `Sent access codes to ${results.sent} attendee(s)${
            results.failed.length ? ` (${results.failed.length} failed)` : ""
          }.`,
          resourceType: "registration",
          conferenceId,
          metadata: {
            requested: registrationIds.length,
            sent: results.sent,
            failed: results.failed.length,
          },
        });
      }

      const message =
        results.failed.length === 0
          ? `Access codes emailed to ${results.sent} attendee(s). Previous codes for those people no longer work.`
          : `Emailed ${results.sent} of ${registrationIds.length}. ${results.failed.length} could not be sent.`;

      return NextResponse.json({ ok: results.failed.length === 0, message, queued: false, ...results });
    }

    // Large sends: enqueue all, then fire the first batch immediately.
    const { jobId, queued } = await enqueueAccessCodeEmails({
      registrationIds,
      conferenceId,
      actorId: session.user.id,
      actorEmail: session.user.email,
    });

    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.EMAIL_QUEUE_ENQUEUE,
      description: `Queued ${queued} access-code email(s) for batch delivery (job ${jobId}).`,
      resourceType: "registration",
      conferenceId,
      metadata: { jobId, queued },
    });

    // Fire the first batch right away (force=true skips the cool-down check for the first run).
    const firstBatch = await processEmailQueue({ jobId, force: true });

    if (firstBatch.processed > 0) {
      await logActivity({
        session,
        request,
        action: ACTIVITY_ACTIONS.EMAIL_QUEUE_PROCESS,
        description: `Email queue batch: ${firstBatch.sent} sent, ${firstBatch.failed} failed. ${firstBatch.remaining} remaining.`,
        conferenceId,
        metadata: { jobId, ...firstBatch },
      });
    }

    return NextResponse.json({
      ok: true,
      queued: true,
      jobId,
      total: queued,
      sent: firstBatch.sent,
      failed: firstBatch.failed,
      remaining: firstBatch.remaining,
      cooldownMs: firstBatch.cooldownMs,
      message:
        firstBatch.remaining > 0
          ? `Sent ${firstBatch.sent} of ${queued}. ${firstBatch.remaining} remaining — next batch in 5 minutes.`
          : `All ${firstBatch.sent} access codes emailed successfully.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send access codes.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
