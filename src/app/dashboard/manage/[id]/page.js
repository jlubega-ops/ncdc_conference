import { notFound, redirect } from "next/navigation";
import { ConferenceAdminDetail } from "@/components/dashboard/ConferenceAdminDetail";
import { canAssignConferenceAdmins } from "@/lib/auth/conference-access";
import { requireConferenceManager } from "@/lib/auth/guards";
import { getConferenceByIdForAdmin } from "@/lib/conferences/service";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const conference = await getConferenceByIdForAdmin(id);
  return {
    title: conference
      ? `${conference.title} | Manage Conference`
      : "Conference | NCDC Dashboard",
  };
}

export default async function ManageConferenceDetailPage({ params }) {
  const session = await requireConferenceManager();
  if (!session) {
    redirect("/login?redirect=/dashboard/manage");
  }

  const { id } = await params;
  const conference = await getConferenceByIdForAdmin(id, session);
  if (!conference) {
    notFound();
  }

  return (
    <ConferenceAdminDetail
      conference={conference}
      canAssignAdmins={canAssignConferenceAdmins(session)}
    />
  );
}
