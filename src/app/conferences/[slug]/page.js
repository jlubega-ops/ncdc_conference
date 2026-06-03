import { notFound } from "next/navigation";
import { ConferenceDetailHero } from "@/components/conference/ConferenceDetailHero";
import { ConferenceTabs } from "@/components/conference/ConferenceTabs";
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

export default async function ConferenceDetailPage({ params }) {
  const { slug } = await params;
  const conference = await getPublishedConferenceBySlug(slug);

  if (!conference) notFound();

  return (
    <div className="bg-background">
      <ConferenceDetailHero conference={conference} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ConferenceTabs conference={conference} />
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const conferences = await getPublishedConferences();
  return conferences.map((c) => ({ slug: c.slug }));
}
