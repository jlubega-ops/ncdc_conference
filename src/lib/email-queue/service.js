import { prisma } from "@/lib/prisma";

/** Max emails sent per processing run */
export const QUEUE_BATCH_SIZE = 20;

/** Minimum gap between processing runs (milliseconds) */
export const QUEUE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/** Max automatic retries before marking as failed */
const MAX_ATTEMPTS = 3;

/**
 * Enqueue a batch of access-code emails for a conference.
 * Returns the jobId so the caller can poll status.
 *
 * @param {{
 *   registrationIds: string[];
 *   conferenceId: string;
 *   actorId?: string;
 *   actorEmail?: string;
 * }} params
 */
export async function enqueueAccessCodeEmails({ registrationIds, conferenceId, actorId, actorEmail }) {
  const ids = [...new Set((registrationIds || []).map((id) => String(id).trim()).filter(Boolean))];
  if (ids.length === 0) throw new Error("No registration IDs provided.");

  const jobId = `access_codes.${conferenceId}.${Date.now()}`;

  await prisma.emailQueue.createMany({
    data: ids.map((registrationId) => ({
      jobId,
      actorId: actorId ?? null,
      actorEmail: actorEmail ?? null,
      conferenceId,
      type: "access_code",
      payload: { registrationId, conferenceId },
      status: "pending",
      scheduledAt: new Date(),
    })),
  });

  return { jobId, queued: ids.length };
}

/**
 * Process up to QUEUE_BATCH_SIZE pending emails.
 * Enforces a 5-minute cool-down: skips if a batch was processed within the last 5 minutes
 * (unless `force` is true — used for the very first batch right after enqueueing).
 *
 * @param {{ jobId?: string; force?: boolean }} opts
 * @returns {{ processed: number; sent: number; failed: number; remaining: number; cooldownMs: number | null }}
 */
export async function processEmailQueue({ jobId, force = false } = {}) {
  // Check cool-down: find the most recent processedAt across all queue items.
  const lastProcessed = await prisma.emailQueue.findFirst({
    where: { status: { in: ["sent", "failed", "skipped"] }, ...(jobId ? { jobId } : {}) },
    orderBy: { processedAt: "desc" },
    select: { processedAt: true },
  });

  if (!force && lastProcessed?.processedAt) {
    const elapsed = Date.now() - lastProcessed.processedAt.getTime();
    if (elapsed < QUEUE_INTERVAL_MS) {
      const cooldownMs = QUEUE_INTERVAL_MS - elapsed;
      const remaining = await prisma.emailQueue.count({
        where: { status: "pending", ...(jobId ? { jobId } : {}) },
      });
      return { processed: 0, sent: 0, failed: 0, remaining, cooldownMs };
    }
  }

  // Claim a batch atomically — update status to "processing" before loading payloads.
  // MySQL doesn't support UPDATE...RETURNING, so we use a two-step approach with a
  // unique batchKey to avoid double-processing across concurrent requests.
  const batchKey = `batch_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const pending = await prisma.emailQueue.findMany({
    where: { status: "pending", attempts: { lt: MAX_ATTEMPTS }, ...(jobId ? { jobId } : {}) },
    orderBy: { scheduledAt: "asc" },
    take: QUEUE_BATCH_SIZE,
    select: { id: true },
  });

  if (pending.length === 0) {
    const remaining = await prisma.emailQueue.count({
      where: { status: "pending", ...(jobId ? { jobId } : {}) },
    });
    return { processed: 0, sent: 0, failed: 0, remaining, cooldownMs: null };
  }

  const ids = pending.map((r) => r.id);

  // Mark as "processing" — prevents concurrent runs from picking the same items.
  await prisma.emailQueue.updateMany({
    where: { id: { in: ids }, status: "pending" },
    data: { status: "processing", error: batchKey },
  });

  // Re-fetch with full payload (only the rows we just claimed).
  const items = await prisma.emailQueue.findMany({
    where: { id: { in: ids }, error: batchKey },
  });

  let sent = 0;
  let failed = 0;

  for (const item of items) {
    await processQueueItem(item);
    const refreshed = await prisma.emailQueue.findUnique({ where: { id: item.id }, select: { status: true } });
    if (refreshed?.status === "sent") sent++;
    else failed++;
  }

  const remaining = await prisma.emailQueue.count({
    where: { status: "pending", ...(jobId ? { jobId } : {}) },
  });

  return { processed: items.length, sent, failed, remaining, cooldownMs: remaining > 0 ? QUEUE_INTERVAL_MS : null };
}

/**
 * Process a single queue item. Handles access_code type.
 * @param {any} item
 */
async function processQueueItem(item) {
  const now = new Date();
  try {
    const payload = item.payload;

    if (item.type === "access_code") {
      const registration = await prisma.conferenceRegistration.findUnique({
        where: { id: payload.registrationId },
        include: {
          user: { select: { id: true, email: true, name: true, profileData: true } },
          conference: true,
        },
      });

      if (!registration) {
        await prisma.emailQueue.update({
          where: { id: item.id },
          data: { status: "failed", error: "Registration not found.", processedAt: now, attempts: { increment: 1 } },
        });
        return;
      }

      if (registration.status !== "CONFIRMED") {
        await prisma.emailQueue.update({
          where: { id: item.id },
          data: { status: "skipped", error: "Not confirmed.", processedAt: now, attempts: { increment: 1 } },
        });
        return;
      }

      // Dynamically import to avoid circular deps / client-bundle leakage
      const { issueAndEmailAccessKey } = await import("@/lib/registration/access-key-issue");
      const result = await issueAndEmailAccessKey({
        user: registration.user,
        conference: registration.conference,
      });

      if (result.emailSent || result.emailSkipped) {
        await prisma.emailQueue.update({
          where: { id: item.id },
          data: { status: "sent", error: null, processedAt: now, attempts: { increment: 1 } },
        });
      } else {
        throw new Error("Email could not be sent.");
      }
    } else {
      await prisma.emailQueue.update({
        where: { id: item.id },
        data: { status: "failed", error: `Unknown type: ${item.type}`, processedAt: now, attempts: { increment: 1 } },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const nextAttempts = (item.attempts ?? 0) + 1;
    await prisma.emailQueue.update({
      where: { id: item.id },
      data: {
        status: nextAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
        error: message,
        processedAt: now,
        attempts: nextAttempts,
      },
    });
  }
}

/**
 * Get the current status of a queue job.
 * @param {string} jobId
 */
export async function getQueueJobStatus(jobId) {
  const rows = await prisma.emailQueue.groupBy({
    by: ["status"],
    where: { jobId },
    _count: { id: true },
  });

  const counts = { pending: 0, processing: 0, sent: 0, failed: 0, skipped: 0 };
  for (const row of rows) {
    counts[row.status] = (counts[row.status] ?? 0) + row._count.id;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const done = counts.sent + counts.failed + counts.skipped;
  const remaining = counts.pending + counts.processing;

  // When was the last item processed?
  const lastItem = await prisma.emailQueue.findFirst({
    where: { jobId, processedAt: { not: null } },
    orderBy: { processedAt: "desc" },
    select: { processedAt: true },
  });

  let cooldownMs = null;
  if (remaining > 0 && lastItem?.processedAt) {
    const elapsed = Date.now() - lastItem.processedAt.getTime();
    cooldownMs = Math.max(0, QUEUE_INTERVAL_MS - elapsed);
  }

  return { jobId, total, done, remaining, counts, cooldownMs };
}
