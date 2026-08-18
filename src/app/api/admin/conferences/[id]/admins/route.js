import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSuperadminUser } from "@/lib/auth/conference-access";
import { authorizeConferenceAccess, authorizeSuperadminCapability } from "@/lib/auth/guards";
import {
  assignConferenceAdmin,
  createAndAssignConferenceAdmin,
  listConferenceAdmins,
  removeConferenceAdmin,
} from "@/lib/conference-admins/service";
import { logActivity } from "@/lib/activity-log/service";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/actions";

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await authorizeConferenceAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  const admins = await listConferenceAdmins(id, session.user.id);
  return NextResponse.json({
    admins,
    canAssign: isSuperadminUser(session),
  });
}

export async function POST(request, { params }) {
  const { id: conferenceId } = await params;
  const access = await authorizeSuperadminCapability();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { id: true, title: true },
  });
  if (!conference) {
    return NextResponse.json({ error: "Conference not found." }, { status: 404 });
  }

  try {
    const body = await request.json();

    if (body.mode === "new") {
      const email = String(body.email ?? "").trim();
      const firstName = String(body.firstName ?? body.name ?? "").trim();
      const lastName = String(body.lastName ?? "").trim();
      const gender = String(body.gender ?? "M").trim();

      if (!email) {
        return NextResponse.json({ error: "Email is required." }, { status: 400 });
      }
      if (!firstName || !lastName) {
        return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
      }

      const result = await createAndAssignConferenceAdmin({
        conferenceId,
        email,
        firstName,
        lastName,
        gender,
      });

      await logActivity({
        session,
        request,
        action: ACTIVITY_ACTIONS.CONFERENCE_ADMIN_ASSIGN,
        description: `Assigned new conference admin ${email}`,
        resourceType: "conference",
        resourceId: conferenceId,
        conferenceId,
        metadata: { emailSent: result.emailSent, mode: "new" },
      });

      return NextResponse.json({
        admins: result.admins,
        message: result.emailSent
          ? "Conference admin created and activation email sent."
          : "Conference admin created but activation email could not be sent.",
      });
    }

    const userId = String(body.userId ?? "").trim();
    if (!userId) {
      return NextResponse.json({ error: "User is required." }, { status: 400 });
    }

    const { admins, alreadyAssigned, isSuperadmin } = await assignConferenceAdmin(
      conferenceId,
      userId,
    );
    let message = alreadyAssigned
      ? "Conference admin assignment confirmed for this conference."
      : "Conference admin assigned successfully.";
    if (isSuperadmin) {
      message =
        "User is a system super admin (full access to all conferences). Conference admin role recorded for this conference.";
    }
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.CONFERENCE_ADMIN_ASSIGN,
      description: alreadyAssigned
        ? "Confirmed conference admin assignment"
        : "Assigned conference admin",
      resourceType: "user",
      resourceId: userId,
      conferenceId,
      metadata: { alreadyAssigned, isSuperadmin },
    });
    return NextResponse.json({
      admins,
      alreadyAssigned,
      message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not assign conference admin.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id: conferenceId } = await params;
  const access = await authorizeSuperadminCapability();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const session = access.session;

  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  try {
    const admins = await removeConferenceAdmin(conferenceId, userId);
    await logActivity({
      session,
      request,
      action: ACTIVITY_ACTIONS.CONFERENCE_ADMIN_REMOVE,
      description: "Removed conference admin assignment",
      resourceType: "user",
      resourceId: userId,
      conferenceId,
    });
    return NextResponse.json({
      ok: true,
      admins,
      message: "Conference admin unassigned from this conference.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove conference admin.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
