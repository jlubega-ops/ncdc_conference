import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ConferenceAdminDetail } from "@/components/dashboard/ConferenceAdminDetail";
import { canAssignConferenceAdmins } from "@/lib/auth/conference-access";
import { requireConferenceManagerPage } from "@/lib/auth/guards";
import { getCurrentSession } from "@/lib/auth/session";
import { getConferenceByIdForAdmin } from "@/lib/conferences/service";

export async function generateMetadata({ params }) {
  const session = await getCurrentSession();
  const { id } = await params;
  if (!session) {
    return { title: "Conference | NCDC Dashboard" };
  }
  const conference = await getConferenceByIdForAdmin(id, session);
  return {
    title: conference
      ? `${conference.title} | Manage Conference`
      : "Conference | NCDC Dashboard",
  };
}

const VALID_TABS = new Set([
  "info",
  "registrations",
  "attendance",
  "gifts",
  "submissions",
  "feedback",
  "materials",
  "admins",
]);

export default async function ManageConferenceDetailPage({ params, searchParams }) {
  const session = await requireConferenceManagerPage("/dashboard/manage");

  const { id } = await params;
  const query = await searchParams;
  const tabParam = typeof query?.tab === "string" ? query.tab : "info";
  const initialTab = VALID_TABS.has(tabParam) ? tabParam : "info";

  const conference = await getConferenceByIdForAdmin(id, session);
  if (!conference) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Loading conference…</p>
      }
    >
      <ConferenceAdminDetail
        conference={conference}
        canAssignAdmins={canAssignConferenceAdmins(session)}
        initialTab={initialTab}
      />
    </Suspense>
  );
}
