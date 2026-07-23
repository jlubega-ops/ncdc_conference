import { prisma } from "@/lib/prisma";

/**
 * @param {Request | null | undefined} request
 */
export function getRequestMeta(request) {
  if (!request || typeof request.headers?.get !== "function") {
    return { ipAddress: null, userAgent: null };
  }
  const forwarded = request.headers.get("x-forwarded-for");
  const ipRaw =
    (forwarded ? forwarded.split(",")[0] : null) ||
    request.headers.get("x-real-ip") ||
    null;
  const ipAddress = ipRaw ? String(ipRaw).trim().slice(0, 45) : null;
  const userAgent = request.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

/**
 * Persist an activity log entry. Never throws to callers — logging must not break the action.
 * Never pass secrets (passwords, access keys, tokens) in metadata/description.
 *
 * @param {{
 *   session?: { user?: { id?: string; email?: string; name?: string | null }; activeRole?: string } | null;
 *   request?: Request | null;
 *   action: string;
 *   description: string;
 *   resourceType?: string | null;
 *   resourceId?: string | null;
 *   conferenceId?: string | null;
 *   metadata?: Record<string, unknown> | null;
 *   success?: boolean;
 *   actorEmail?: string | null;
 *   actorName?: string | null;
 *   actorRole?: string | null;
 *   actorId?: string | null;
 * }} params
 */
export async function logActivity(params) {
  try {
    const {
      session = null,
      request = null,
      action,
      description,
      resourceType = null,
      resourceId = null,
      conferenceId = null,
      metadata = null,
      success = true,
    } = params;

    if (!action || !description) return;

    const { ipAddress, userAgent } = getRequestMeta(request);
    const actorId = params.actorId ?? session?.user?.id ?? null;
    const actorEmail =
      params.actorEmail ?? session?.user?.email ?? null;
    const actorName = params.actorName ?? session?.user?.name ?? null;
    const actorRole = params.actorRole ?? session?.activeRole ?? null;

    await prisma.activityLog.create({
      data: {
        actorId,
        actorEmail: actorEmail ? String(actorEmail).toLowerCase().slice(0, 255) : null,
        actorName: actorName ? String(actorName).slice(0, 255) : null,
        actorRole: actorRole ? String(actorRole).slice(0, 32) : null,
        action: String(action).slice(0, 80),
        description: String(description).slice(0, 4000),
        resourceType: resourceType ? String(resourceType).slice(0, 64) : null,
        resourceId: resourceId ? String(resourceId).slice(0, 80) : null,
        conferenceId: conferenceId || null,
        metadata: metadata && typeof metadata === "object" ? metadata : undefined,
        success: Boolean(success),
        ipAddress,
        userAgent: userAgent ? String(userAgent).slice(0, 2000) : null,
      },
    });
  } catch (err) {
    console.error("[activity-log] Failed to write log:", err);
  }
}

/**
 * @param {{
 *   q?: string;
 *   action?: string;
 *   actorId?: string;
 *   conferenceId?: string;
 *   success?: boolean | null;
 *   limit?: number;
 *   offset?: number;
 * }} [filters]
 */
export async function listActivityLogs(filters = {}) {
  const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
  const offset = Math.max(0, Number(filters.offset) || 0);
  const q = String(filters.q || "").trim();

  /** @type {import("@prisma/client").Prisma.ActivityLogWhereInput} */
  const where = {};
  if (filters.action) where.action = String(filters.action);
  if (filters.actorId) where.actorId = String(filters.actorId);
  if (filters.conferenceId) where.conferenceId = String(filters.conferenceId);
  if (typeof filters.success === "boolean") where.success = filters.success;
  if (q) {
    where.OR = [
      { description: { contains: q } },
      { actorEmail: { contains: q } },
      { actorName: { contains: q } },
      { action: { contains: q } },
      { resourceId: { contains: q } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
  ]);

  return { total, limit, offset, rows };
}
