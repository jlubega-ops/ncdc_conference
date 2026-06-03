import { ConferenceCard } from "@/components/ConferenceCard";
import { Button } from "@/components/ui/Button";

export function FeaturedConferences({ conferences }) {
  const featured = conferences ?? [];

  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Featured & Upcoming Conferences
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore active and upcoming events on the platform.
            </p>
          </div>
          <Button variant="outline" size="sm" href="/conferences">
            View All Conferences
          </Button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {featured.map((conference) => (
            <ConferenceCard
              key={conference.slug}
              conference={conference}
              variant="featured"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
