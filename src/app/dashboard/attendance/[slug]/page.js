import { redirect } from "next/navigation";
import { AttendanceConferenceView } from "@/components/dashboard/AttendanceConferenceView";
import { canManageConference } from "@/lib/auth/conference-access";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Conference attendance | NCDC Dashboard",
};

export default async function AttendanceConferencePage({ params }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?redirect=/dashboard/attendance");
  }

  const { slug } = await params;
  const conference = await prisma.conference.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (!conference) {
    redirect("/dashboard");
  }

  const isManager = canManageConference(session, conference.id);
  if (!isManager) {
    const registration = await prisma.conferenceRegistration.findUnique({
      where: {
        conferenceId_userId: {
          conferenceId: conference.id,
          userId: session.user.id,
        },
      },
      select: { status: true },
    });
    if (!registration || registration.status !== "CONFIRMED") {
      redirect("/dashboard");
    }
  }

  return <AttendanceConferenceView slug={slug} />;
}
