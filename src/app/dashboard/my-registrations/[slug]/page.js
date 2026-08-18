import { notFound, redirect } from "next/navigation";
import { MyRegistrationConferenceView } from "@/components/dashboard/MyRegistrationConferenceView";
import { requirePermissionPage } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getUserConferenceRegistration } from "@/lib/registration/access";
import { getPublishedConferenceBySlugCached } from "@/lib/conferences/public-cache";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const conference = await getPublishedConferenceBySlugCached(slug);
  if (!conference) return { title: "Conference Not Found" };
  return {
    title: `${conference.title} | My Registrations`,
  };
}

export default async function DashboardMyRegistrationConferencePage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;

  const session = await requirePermissionPage(
    PERMISSIONS.MY_REGISTRATIONS,
    `/dashboard/my-registrations/${slug}`,
  );

  const conference = await getPublishedConferenceBySlugCached(slug);
  if (!conference) notFound();

  const reg = await getUserConferenceRegistration(session.user.id, conference.id);
  if (!reg) {
    redirect("/dashboard/my-registrations");
  }

  const initialTab = typeof query?.tab === "string" ? query.tab : null;

  return (
    <MyRegistrationConferenceView
      conference={conference}
      registrationStatus={reg.status}
      registration={{
        paymentStatus: reg.paymentStatus,
        improvementRequest: reg.improvementRequest,
        adminNotes: reg.adminNotes,
      }}
      initialTab={initialTab}
    />
  );
}
