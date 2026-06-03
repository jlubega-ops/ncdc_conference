import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConferenceDetailHero } from "@/components/conference/ConferenceDetailHero";
import { ConferenceTabs } from "@/components/conference/ConferenceTabs";
import { getSessionRecord } from "@/lib/auth/session";
import { getUserConferenceRegistration } from "@/lib/registration/access";
import {
  getPublishedConferenceBySlug,
  getPublishedConferences,
} from "@/lib/conferences/service";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const conference = await getPublishedConferenceBySlug(slug);
  if (!conference) return { title: "Conference Not Found" };
  return {
    title: `${conference.title} | NCDC Conference`,
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

  try {
    const session = await getSessionRecord();
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

  const initialTab = typeof query?.tab === "string" ? query.tab : null;

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
