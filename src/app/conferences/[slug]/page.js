import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ConferenceDetailHero } from "@/components/conference/ConferenceDetailHero";
import { ConferenceTabs } from "@/components/conference/ConferenceTabs";
import { canManageConference } from "@/lib/auth/conference-access";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";
import { getCurrentSession } from "@/lib/auth/session";
import { getUserConferenceRegistration } from "@/lib/registration/access";
import {
  getPublishedConferenceBySlugCached,
  isInviteOnlyConference,
} from "@/lib/conferences/service";
import { getMemberContentAvailability } from "@/lib/conference-content/service";

const AUTH_REQUIRED_TABS = new Set([
  "attendance",
  "certificate",
  "certificates",
  "feedback",
  "materials",
]);

/**
 * @param {string} slug
 * @param {Record<string, string | string[] | undefined>} query
 */
function conferenceReturnPath(slug, query) {
  const params = new URLSearchParams();
  const tab = typeof query?.tab === "string" ? query.tab : "";
  if (tab) params.set("tab", tab);
  const qs = params.toString();
  return qs ? `/conferences/${slug}?${qs}` : `/conferences/${slug}`;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const conference = await getPublishedConferenceBySlugCached(slug);
  if (!conference) return { title: "Conference Not Found" };
  if (isInviteOnlyConference(conference)) {
    return { title: "Conference | Conference Management", robots: { index: false, follow: false } };
  }
  return {
    title: `${conference.title} | Conference Management`,
    description: conference.shortDescription,
  };
}

export const dynamic = "force-dynamic";

export default async function ConferenceDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const conference = await getPublishedConferenceBySlugCached(slug);

  if (!conference) notFound();

  const returnPath = conferenceReturnPath(slug, query);
  const requestedTab =
    typeof query?.tab === "string"
      ? query.tab === "presentations"
        ? "materials"
        : query.tab
      : null;

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
  } catch (err) {
    if (err && typeof err === "object" && err.digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    /* ignore session lookup failures */
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
        redirect(`/access?redirect=${encodeURIComponent(returnPath)}`);
      }
      notFound();
    }
  }

  // Deep links to member-only sections require an access code when logged out.
  if (!isAuthenticated && requestedTab && AUTH_REQUIRED_TABS.has(requestedTab)) {
    redirect(`/access?redirect=${encodeURIComponent(returnPath)}`);
  }

  const initialTab = requestedTab;
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
      <ConferenceDetailHero conference={conference} compact={isConfirmedAttendee} />

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
