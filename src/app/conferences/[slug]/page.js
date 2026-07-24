import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ConferenceDetailHero } from "@/components/conference/ConferenceDetailHero";
import { ConferenceTabs } from "@/components/conference/ConferenceTabs";
import { canManageConference } from "@/lib/auth/conference-access";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";
import { getCurrentSession } from "@/lib/auth/session";
import { getUserConferenceRegistration } from "@/lib/registration/access";
import {
  getPublishedConferenceBySlug,
  getPublishedConferences,
  isInviteOnlyConference,
} from "@/lib/conferences/service";
import { getMemberContentAvailability } from "@/lib/conference-content/service";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const conference = await getPublishedConferenceBySlug(slug);
  if (!conference) return { title: "Conference Not Found" };
  if (isInviteOnlyConference(conference)) {
    return { title: "Conference | Conference Management", robots: { index: false, follow: false } };
  }
  return {
    title: `${conference.title} | Conference Management`,
    description: conference.shortDescription,
  };
}

export default async function ConferenceDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const conference = await getPublishedConferenceBySlug(slug);

  if (!conference) notFound();

  let registrationStatus = null;
  let registration = null;
  let isAuthenticated = false;
  let session = null;

  try {
    session = await getCurrentSession();
    if (session?.user?.id) {
      isAuthenticated = true;
      const reg = await getUserConferenceRegistration(session.user.id, conference.id);
      if (reg) {
        registrationStatus = reg.status;
        registration = {
          paymentStatus: reg.paymentStatus,
          improvementRequest: reg.improvementRequest,
          adminNotes: reg.adminNotes,
        };
      }
    }
  } catch {
    /* ignore */
  }

  // Logged-in users do not browse public conference pages.
  // Confirmed attendees may open their conference hub; managers may preview theirs.
  if (session) {
    const isManager = canManageConference(session, conference.id);
    const isConfirmedAttendee = registrationStatus === "CONFIRMED";
    if (!isConfirmedAttendee && !isManager) {
      redirect(getDefaultDashboardPath(session));
    }
  }

  if (isInviteOnlyConference(conference)) {
    const isManager = session ? canManageConference(session, conference.id) : false;
    const hasAccess = registrationStatus === "CONFIRMED" || isManager;
    if (!hasAccess) {
      if (!isAuthenticated) {
        redirect(`/login?mode=access&redirect=${encodeURIComponent(`/conferences/${slug}`)}`);
      }
      notFound();
    }
  }

  const initialTab = typeof query?.tab === "string" ? query.tab : null;

  const isManager = session ? canManageConference(session, conference.id) : false;
  const isConfirmedAttendee = registrationStatus === "CONFIRMED";
  const canAccessMemberContent = Boolean(isManager || isConfirmedAttendee);

  let memberContent = null;
  if (canAccessMemberContent) {
    try {
      memberContent = await getMemberContentAvailability(conference.id);
    } catch {
      memberContent = null;
    }
  }

  return (
    <div className="bg-background">
      <ConferenceDetailHero conference={conference} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Suspense fallback={<div className="py-8 text-sm text-muted-foreground">Loading…</div>}>
          <ConferenceTabs
            conference={conference}
            registrationStatus={registrationStatus}
            registration={registration}
            isAuthenticated={isAuthenticated}
            initialTab={initialTab}
            memberContent={memberContent}
            canAccessMemberContent={canAccessMemberContent}
          />
        </Suspense>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const conferences = await getPublishedConferences();
  return conferences.map((c) => ({ slug: c.slug }));
}
