import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConferenceYear, isRegistrableConference } from "@/lib/conferences/registrable";
import { mapConferenceForUi } from "@/lib/conferences/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";
import { checkRateLimit, clientIpFromRequest } from "@/lib/auth/rate-limit";

export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const limit = checkRateLimit(`signup:${ip}`, { limit: 10, windowMs: 60_000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const email = (body.email ?? "").trim().toLowerCase();
    const name = (body.name ?? "").trim() || null;
    const conferenceId = (body.conferenceId ?? "").trim();

    if (!email || !conferenceId) {
      return NextResponse.json(
        { error: "Email and conference are required." },
        { status: 400 },
      );
    }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
    });

    if (!conference || conference.publicationStatus !== "PUBLISHED") {
      return NextResponse.json({ error: "Conference not found." }, { status: 404 });
    }

    const mapped = mapConferenceForUi(conference);
    if (!isRegistrableConference(mapped)) {
      return NextResponse.json(
        {
          error:
            "Registration is only open for upcoming or currently running conferences. This conference is not accepting new sign-ups.",
          code: "CONFERENCE_CLOSED",
        },
        { status: 400 },
      );
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    const staffRoles = ["SUPERADMIN", "CONFERENCE_ADMIN", "REVIEWER"];
    if (user?.roles.some((r) => staffRoles.includes(r.role))) {
      return NextResponse.json(
        {
          error:
            "This email is registered as staff. Please use staff sign-in instead of attendee signup.",
          code: "STAFF_ACCOUNT",
        },
        { status: 400 },
      );
    }

    const existingRegistration = user
      ? await prisma.conferenceRegistration.findUnique({
          where: {
            conferenceId_userId: {
              conferenceId,
              userId: user.id,
            },
          },
        })
      : null;

    if (existingRegistration) {
      if (existingRegistration.status === "PENDING") {
        return NextResponse.json(
          {
            error: `You have already signed up for ${conference.title}. Your registration is awaiting admin activation. You will receive an access key by email once approved.`,
            code: "PENDING_ACTIVATION",
          },
          { status: 409 },
        );
      }
      if (existingRegistration.status === "CONFIRMED") {
        return NextResponse.json(
          {
            error: `You are already registered for ${conference.title}. Sign in with your email and the access code sent to you (format: NCDC/CONF${getConferenceYear(mapped)}/…).`,
            code: "ALREADY_REGISTERED",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: `A registration record already exists for ${conference.title}. Contact the conference organizers if you need help.`,
          code: "EXISTING_REGISTRATION",
        },
        { status: 409 },
      );
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
        },
        include: { roles: true },
      });
    } else if (name && !user.name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name },
        include: { roles: true },
      });
    }

    await prisma.conferenceRegistration.create({
      data: {
        conferenceId,
        userId: user.id,
        status: "PENDING",
      },
    });

    const hasAttendee = user.roles.some(
      (r) => r.role === "ATTENDEE" && r.conferenceId === conferenceId,
    );
    if (!hasAttendee) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          role: "ATTENDEE",
          conferenceId,
        },
      });
    }

    await logActivity({
      request,
      action: ACTIVITY_ACTIONS.AUTH_SIGNUP,
      description: `Attendee sign-up for ${conference.title}`,
      resourceType: "registration",
      resourceId: user.id,
      conferenceId,
      actorEmail: email,
      metadata: { conferenceTitle: conference.title },
    });

    return NextResponse.json({
      ok: true,
      message: `Sign-up received for ${conference.title}. Your account will be activated by an administrator. You will receive an access key by email when approved.`,
      conference: { id: conference.id, title: conference.title },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Unable to complete sign-up. Please try again." },
      { status: 500 },
    );
  }
}
