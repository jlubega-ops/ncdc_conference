import { ConferenceCard } from "@/components/ConferenceCard";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";
import { getPublishedConferences } from "@/lib/conferences/service";

export const metadata = {
  title: "Conferences | Conference Management",
  description: "Browse open and upcoming conferences on the platform.",
};

export default async function ConferencesPage() {
  await redirectIfAuthenticated();

  const conferences = await getPublishedConferences();

  return (
    <div className="bg-background">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-bold text-foreground">Conferences</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Browse open and upcoming conferences. Select an event to view details, register, or
            access programme information.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {conferences.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
            No published conferences are available right now. Check back soon, or use a conference
            code from the home page if you were invited to a specific event.
          </p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {conferences.map((conference) => (
              <ConferenceCard
                key={conference.slug}
                conference={conference}
                variant="featured"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
