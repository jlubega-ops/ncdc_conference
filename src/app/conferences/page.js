import { ConferenceCard } from "@/components/ConferenceCard";
import { getPublishedConferences } from "@/lib/conferences/service";

export const metadata = {
  title: "All Conferences | NCDC Conference Platform",
  description: "Browse all conferences hosted on the NCDC Conference Management Platform.",
};

export default async function ConferencesPage() {
  const conferences = await getPublishedConferences();

  return (
    <div className="bg-background">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-bold text-foreground">All Conferences</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Browse every conference hosted on the NCDC platform — from research
            forums to teacher summits and specialist education events.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          {conferences.map((conference) => (
            <ConferenceCard
              key={conference.slug}
              conference={conference}
              variant="featured"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
