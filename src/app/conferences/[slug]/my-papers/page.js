import Link from "next/link";
import { redirect } from "next/navigation";
import { ConferenceMyPapers } from "@/components/conference/ConferenceMyPapers";
import { getSessionRecord } from "@/lib/auth/session";
import { getPublishedConferenceBySlug } from "@/lib/conferences/service";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const conference = await getPublishedConferenceBySlug(slug);
  if (!conference) return { title: "Conference Not Found" };
  return {
    title: `My papers — ${conference.title} | NCDC Conference`,
  };
}

export default async function ConferenceMyPapersPage({ params }) {
  const { slug } = await params;
  const conference = await getPublishedConferenceBySlug(slug);
  if (!conference) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center">
        <p>Conference not found.</p>
        <Link href="/conferences" className="mt-4 text-primary hover:underline">
          Browse conferences
        </Link>
      </div>
    );
  }

  const session = await getSessionRecord();
  if (!session) {
    redirect(`/login?redirect=/conferences/${slug}/my-papers`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <ConferenceMyPapers slug={slug} conferenceTitle={conference.title} />
    </div>
  );
}
