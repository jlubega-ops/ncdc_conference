import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeConferenceAccess } from "@/lib/auth/guards";
import {
  getZonedDateTimeParts,
  normalizeConferenceDays,
} from "@/lib/attendance/utils";
import { getProfileFromUser, buildProfilePayload } from "@/lib/users/profile";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

/**
 * @param {any} mark
 * @param {any} registration
 */
function mapAttendanceRow(mark, registration) {
  const profile = getProfileFromUser(mark.user);
  const form =
    registration?.formData && typeof registration.formData === "object"
      ? registration.formData
      : {};
  return {
    id: mark.id,
    dayDate: mark.dayDate,
    dayIndex: mark.dayIndex,
    markedAt: mark.markedAt,
    userId: mark.userId,
    user: {
      id: mark.user.id,
      email: mark.user.email,
      name: profile.fullName || mark.user.name || mark.user.email,
      telephone: profile.telephone
        ? `${profile.countryCode || ""} ${profile.telephone}`.trim()
        : form.telephone
          ? `${form.countryCode || ""} ${form.telephone}`.trim()
          : null,
      profile,
    },
    registrationId: registration?.id ?? null,
    formData: form,
  };
}

/**
 * @param {any} registration
 * @param {Map<string, any>} marksByUserDay
 * @param {ReturnType<typeof normalizeConferenceDays>} days
 */
function mapRosterRow(registration, marksByUserDay, days) {
  const profile = getProfileFromUser(registration.user);
  const form =
    registration.formData && typeof registration.formData === "object"
      ? registration.formData
      : {};
  /** @type {Record<string, { attended: boolean; attendanceId: string | null; markedAt: string | null }>} */
  const byDay = {};
  let daysAttended = 0;
  for (const day of days) {
    const mark = marksByUserDay.get(`${registration.userId}:${day.date}`);
    const attended = Boolean(mark);
    if (attended) daysAttended += 1;
    byDay[day.date] = {
      attended,
      attendanceId: mark?.id ?? null,
      markedAt: mark?.markedAt ?? null,
    };
  }

  return {
    userId: registration.userId,
    registrationId: registration.id,
    registrationStatus: registration.status,
    email: registration.user.email,
    name: profile.fullName || registration.user.name || registration.user.email,
    telephone: profile.telephone
      ? `${profile.countryCode || ""} ${profile.telephone}`.trim()
      : form.telephone
        ? `${form.countryCode || ""} ${form.telephone}`.trim()
        : null,
    institution: profile.institution || form.institution || null,
    profile,
    formData: form,
    daysAttended,
    totalDays: days.length,
    byDay,
  };
}

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  const conference = await prisma.conference.findUnique({ where: { id } });
  if (!conference) {
    return NextResponse.json({ error: "Conference not found." }, { status: 404 });
  }

  const days = normalizeConferenceDays(conference.conferenceDays);
  const tz = conference.timezone || "Africa/Nairobi";
  const { dateKey: todayKey } = getZonedDateTimeParts(new Date(), tz);

  const [marks, registrations] = await Promise.all([
    prisma.conferenceAttendance.findMany({
      where: { conferenceId: id },
      include: {
        user: {
          select: { id: true, email: true, name: true, profileData: true },
        },
      },
      orderBy: [{ dayDate: "asc" }, { markedAt: "desc" }],
    }),
    prisma.conferenceRegistration.findMany({
      where: { conferenceId: id, status: "CONFIRMED" },
      include: {
        user: {
          select: { id: true, email: true, name: true, profileData: true },
        },
      },
      orderBy: { registeredAt: "asc" },
    }),
  ]);

  const regByUser = new Map(registrations.map((r) => [r.userId, r]));
  /** @type {Map<string, any>} */
  const marksByUserDay = new Map();
  for (const mark of marks) {
    marksByUserDay.set(`${mark.userId}:${mark.dayDate}`, mark);
  }

  const roster = registrations.map((r) => mapRosterRow(r, marksByUserDay, days));

  const daySummaries = days.map((day) => {
    const attended = roster.filter((r) => r.byDay[day.date]?.attended).length;
    const registered = roster.length;
    const absent = Math.max(0, registered - attended);
    const rate =
      registered > 0 ? Math.round((attended / registered) * 100) : 0;
    return {
      ...day,
      isToday: day.date === todayKey,
      registered,
      attended,
      absent,
      rate,
    };
  });

  const todaySummary =
    daySummaries.find((d) => d.date === todayKey) ??
    daySummaries.find((d) => d.date <= todayKey) ??
    daySummaries[0] ??
    null;

  return NextResponse.json({
    timezone: tz,
    todayKey,
    days: daySummaries,
    summary: {
      registered: roster.length,
      totalMarks: marks.length,
      today: todaySummary,
    },
    roster,
    attendance: marks.map((m) => mapAttendanceRow(m, regByUser.get(m.userId))),
    attendees: roster.map((r) => ({
      userId: r.userId,
      registrationId: r.registrationId,
      email: r.email,
      name: r.name,
      profile: r.profile,
      formData: r.formData,
    })),
  });
}

export async function POST(request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
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

  const userId = String(body.userId || "").trim();
  const dayDate = String(body.dayDate || "").trim();
  if (!userId || !dayDate) {
    return NextResponse.json(
      { error: "userId and dayDate are required." },
      { status: 400 },
    );
  }

  const conference = await prisma.conference.findUnique({ where: { id } });
  if (!conference) {
    return NextResponse.json({ error: "Conference not found." }, { status: 404 });
  }

  const days = normalizeConferenceDays(conference.conferenceDays);
  const day = days.find((d) => d.date === dayDate);
  if (!day) {
    return NextResponse.json({ error: "Day is not on the conference schedule." }, { status: 400 });
  }

  const registration = await prisma.conferenceRegistration.findUnique({
    where: { conferenceId_userId: { conferenceId: id, userId } },
  });
  if (!registration || registration.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "User must have a confirmed registration." },
      { status: 400 },
    );
  }

  const mark = await prisma.conferenceAttendance.upsert({
    where: {
      conferenceId_userId_dayDate: { conferenceId: id, userId, dayDate },
    },
    update: { dayIndex: day.dayIndex },
    create: {
      conferenceId: id,
      userId,
      dayDate,
      dayIndex: day.dayIndex,
    },
    include: {
      user: { select: { id: true, email: true, name: true, profileData: true } },
    },
  });

  await logActivity({
    session,
    request,
    action: ACTIVITY_ACTIONS.ATTENDANCE_MARK,
    description: `Marked attendance for ${dayDate}`,
    resourceType: "attendance",
    resourceId: mark.id,
    conferenceId: id,
    metadata: { userId, dayDate },
  });

  return NextResponse.json({
    ok: true,
    attendance: mapAttendanceRow(mark, registration),
  });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
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

  const attendanceId = String(body.attendanceId || "").trim();
  const userId = String(body.userId || "").trim();

  // Override: set attended true/false for a specific day
  if (userId && body.dayDate && typeof body.attended === "boolean") {
    const dayDate = String(body.dayDate).trim();
    const conference = await prisma.conference.findUnique({ where: { id } });
    if (!conference) {
      return NextResponse.json({ error: "Conference not found." }, { status: 404 });
    }
    const days = normalizeConferenceDays(conference.conferenceDays);
    const day = days.find((d) => d.date === dayDate);
    if (!day) {
      return NextResponse.json({ error: "Invalid day." }, { status: 400 });
    }

    const registration = await prisma.conferenceRegistration.findUnique({
      where: { conferenceId_userId: { conferenceId: id, userId } },
    });
    if (!registration || registration.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "User must have a confirmed registration." },
        { status: 400 },
      );
    }

    if (body.attended) {
      const mark = await prisma.conferenceAttendance.upsert({
        where: {
          conferenceId_userId_dayDate: { conferenceId: id, userId, dayDate },
        },
        update: { dayIndex: day.dayIndex },
        create: {
          conferenceId: id,
          userId,
          dayDate,
          dayIndex: day.dayIndex,
        },
        include: {
          user: { select: { id: true, email: true, name: true, profileData: true } },
        },
      });
      await logActivity({
        session,
        request,
        action: ACTIVITY_ACTIONS.ATTENDANCE_MARK,
        description: `Marked attendance for ${dayDate}`,
        resourceType: "attendance",
        resourceId: mark.id,
        conferenceId: id,
        metadata: { userId, dayDate },
      });
      return NextResponse.json({
        ok: true,
        attendance: mapAttendanceRow(mark, registration),
      });
    }

    await prisma.conferenceAttendance.deleteMany({
      where: { conferenceId: id, userId, dayDate },
    });
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.ATTENDANCE_CLEAR,
      description: `Cleared attendance for ${dayDate}`,
      resourceType: "attendance",
      conferenceId: id,
      metadata: { userId, dayDate },
    });
    return NextResponse.json({ ok: true, removed: true });
  }

  if (attendanceId && body.dayDate) {
    const mark = await prisma.conferenceAttendance.findFirst({
      where: { id: attendanceId, conferenceId: id },
    });
    if (!mark) {
      return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });
    }
    const conference = await prisma.conference.findUnique({ where: { id } });
    const days = normalizeConferenceDays(conference?.conferenceDays);
    const day = days.find((d) => d.date === body.dayDate);
    if (!day) {
      return NextResponse.json({ error: "Invalid day." }, { status: 400 });
    }
    const updated = await prisma.conferenceAttendance.update({
      where: { id: attendanceId },
      data: { dayDate: day.date, dayIndex: day.dayIndex },
      include: {
        user: { select: { id: true, email: true, name: true, profileData: true } },
      },
    });
    const registration = await prisma.conferenceRegistration.findUnique({
      where: {
        conferenceId_userId: { conferenceId: id, userId: updated.userId },
      },
    });
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.ATTENDANCE_UPDATE,
      description: `Moved attendance record to ${day.date}`,
      resourceType: "attendance",
      resourceId: attendanceId,
      conferenceId: id,
      metadata: { dayDate: day.date },
    });
    return NextResponse.json({
      ok: true,
      attendance: mapAttendanceRow(updated, registration),
    });
  }

  if (!userId) {
    return NextResponse.json({ error: "userId is required to edit details." }, { status: 400 });
  }

  const registration = await prisma.conferenceRegistration.findUnique({
    where: { conferenceId_userId: { conferenceId: id, userId } },
    include: {
      user: {
        select: { id: true, email: true, name: true, profileData: true },
      },
    },
  });
  if (!registration) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  const profile = buildProfilePayload({
    ...getProfileFromUser(registration.user),
    ...(body.profile || {}),
  });
  const name = profile.fullName || registration.user.name;
  const existingForm =
    registration.formData && typeof registration.formData === "object"
      ? registration.formData
      : {};

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        name,
        profileData: profile,
      },
    }),
    prisma.conferenceRegistration.update({
      where: { id: registration.id },
      data: {
        formData: {
          ...existingForm,
          ...profile,
          ...(body.formData && typeof body.formData === "object" ? body.formData : {}),
        },
      },
    }),
  ]);

  await logActivity({
    session,
    request,
    action: ACTIVITY_ACTIONS.ATTENDANCE_UPDATE,
    description: "Updated attendee details from attendance roster",
    resourceType: "registration",
    resourceId: registration.id,
    conferenceId: id,
    metadata: { userId },
  });

  return NextResponse.json({ ok: true, message: "Attendee details updated." });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
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

  if (String(body.confirm || "").trim() !== "DELETE") {
    return NextResponse.json(
      { error: "Type DELETE to confirm removal." },
      { status: 400 },
    );
  }

  const attendanceId = String(body.attendanceId || "").trim();
  const userId = String(body.userId || "").trim();
  const dayDate = String(body.dayDate || "").trim();

  if (attendanceId) {
    const existing = await prisma.conferenceAttendance.findFirst({
      where: { id: attendanceId, conferenceId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });
    }
    await prisma.conferenceAttendance.delete({ where: { id: attendanceId } });
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.ATTENDANCE_CLEAR,
      description: "Removed attendance record",
      resourceType: "attendance",
      resourceId: attendanceId,
      conferenceId: id,
    });
    return NextResponse.json({ ok: true });
  }

  if (userId && dayDate) {
    await prisma.conferenceAttendance.deleteMany({
      where: { conferenceId: id, userId, dayDate },
    });
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.ATTENDANCE_CLEAR,
      description: `Cleared attendance for ${dayDate}`,
      resourceType: "attendance",
      conferenceId: id,
      metadata: { userId, dayDate },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "attendanceId or userId+dayDate is required." },
    { status: 400 },
  );
}
