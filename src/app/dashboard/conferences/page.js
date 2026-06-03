import { redirect } from "next/navigation";
import { ConferenceCard } from "@/components/ConferenceCard";
import { Button } from "@/components/ui/Button";
import { requireConferenceManager } from "@/lib/auth/guards";
import { getAdminConferences } from "@/lib/conferences/service";
import { PUBLICATION_LABELS } from "@/lib/conferences/constants";

export default async function DashboardConferencesPage() {
  const session = await requireConferenceManager();
  if (!session) {
    redirect("/login?redirect=/dashboard/conferences");
  }

  const conferences = await getAdminConferences(session);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conferences</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full list across drafts and published conferences.
          </p>
        </div>
        <Button href="/dashboard/manage" variant="primary">
          Manage Conferences
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {conferences.map((conference) => (
          <div key={conference.id} className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-3 flex items-center justify-between text-xs">
              <span className="rounded-md bg-primary-light px-2 py-1 font-medium text-primary">
                {PUBLICATION_LABELS[conference.publicationStatus] ??
                  conference.publicationStatus}
              </span>
              <span className="text-muted-foreground">{conference.status}</span>
            </div>
            <ConferenceCard conference={conference} />
          </div>
        ))}
      </div>
    </div>
  );
}
