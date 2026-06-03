import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

function useDelegate() {
  return typeof prisma.conferenceAttendance !== "undefined";
}

/**
 * @param {{ userId?: string; conferenceId?: string | { in: string[] } }} where
 * @param {{ select?: Record<string, boolean>; orderBy?: { dayDate?: string } }} [opts]
 */
export async function findAttendanceMarks(where, opts = {}) {
  if (useDelegate()) {
    return prisma.conferenceAttendance.findMany({
      where,
      select: opts.select,
      orderBy: opts.orderBy,
    });
  }

  const conditions = ["1=1"];
  /** @type {unknown[]} */
  const params = [];

  if (where.userId) {
    conditions.push("userId = ?");
    params.push(where.userId);
  }
  if (where.conferenceId && typeof where.conferenceId === "object" && where.conferenceId.in) {
    const ids = where.conferenceId.in;
    if (!ids.length) return [];
    conditions.push(`conferenceId IN (${ids.map(() => "?").join(",")})`);
    params.push(...ids);
  } else if (typeof where.conferenceId === "string") {
    conditions.push("conferenceId = ?");
    params.push(where.conferenceId);
  }

  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, conferenceId, userId, dayDate, dayIndex, markedAt
     FROM conference_attendance
     WHERE ${conditions.join(" AND ")}
     ${opts.orderBy?.dayDate === "asc" ? "ORDER BY dayDate ASC" : ""}`,
    ...params,
  );

  return Array.isArray(rows) ? rows : [];
}

/**
 * @param {{ conferenceId: string; userId: string; dayDate: string; dayIndex: number }} data
 */
export async function createAttendanceMark(data) {
  if (useDelegate()) {
    return prisma.conferenceAttendance.create({ data });
  }

  const id = randomUUID().replace(/-/g, "").slice(0, 25);
  await prisma.$executeRawUnsafe(
    `INSERT INTO conference_attendance (id, conferenceId, userId, dayDate, dayIndex, markedAt)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    id,
    data.conferenceId,
    data.userId,
    data.dayDate,
    data.dayIndex,
  );
  return { id, ...data, markedAt: new Date() };
}

/**
 * @param {{ conferenceId?: string | { in: string[] } }} where
 */
export async function countAttendanceMarks(where) {
  if (useDelegate()) {
    return prisma.conferenceAttendance.count({ where });
  }

  const conditions = ["1=1"];
  const params = [];

  if (where.conferenceId && typeof where.conferenceId === "object" && where.conferenceId.in) {
    const ids = where.conferenceId.in;
    if (!ids.length) return 0;
    conditions.push(`conferenceId IN (${ids.map(() => "?").join(",")})`);
    params.push(...ids);
  }

  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as total FROM conference_attendance WHERE ${conditions.join(" AND ")}`,
    ...params,
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  return Number(row?.total ?? 0);
}

/**
 * @param {{ conferenceId?: { in: string[] } }} where
 */
export async function groupAttendanceByUser(where) {
  if (useDelegate()) {
    return prisma.conferenceAttendance.groupBy({
      by: ["userId"],
      where,
      _count: { _all: true },
    });
  }

  const ids = where.conferenceId?.in ?? [];
  if (!ids.length) return [];

  const rows = await prisma.$queryRawUnsafe(
    `SELECT userId, COUNT(*) as cnt FROM conference_attendance
     WHERE conferenceId IN (${ids.map(() => "?").join(",")})
     GROUP BY userId`,
    ...ids,
  );

  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    userId: r.userId,
    _count: { _all: Number(r.cnt) },
  }));
}
