import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConferenceMyPapers } from "@/components/conference/ConferenceMyPapers";
import { getSessionRecord } from "@/lib/auth/session";
import { getUserConferenceRegistration } from "@/lib/registration/access";
import { getPublishedConferenceBySlug } from "@/lib/conferences/service";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const conference = await getPublishedConferenceBySlug(slug);
  if (!conference) return { title: "Conference Not Found" };
  return {
    title: `My papers — ${conference.title}`,
  };
}

export default async function DashboardMyPapersPage({ params }) {
  const { slug } = await params;

  const session = await getSessionRecord();
  if (!session) {
    redirect(`/login?redirect=/dashboard/my-registrations/${slug}/papers`);
  }

  const conference = await getPublishedConferenceBySlug(slug);
  if (!conference) notFound();

  const reg = await getUserConferenceRegistration(session.user.id, conference.id);
  if (!reg) {
    redirect("/dashboard/my-registrations");
  }

  const backHref = `/dashboard/my-registrations/${slug}?tab=cfp`;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" icon={ArrowLeft} href="/dashboard/my-registrations">
        Back to my registrations
      </Button>
      <ConferenceMyPapers
        slug={slug}
        conferenceTitle={conference.title}
        backHref={backHref}
      />
    </div>
  );
}
