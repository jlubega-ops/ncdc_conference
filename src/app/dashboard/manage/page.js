import { Suspense } from "react";
import { ConferenceManager } from "@/components/dashboard/ConferenceManager";
import { requireConferenceManagerPage } from "@/lib/auth/guards";
import { getAdminConferences } from "@/lib/conferences/service";

export default async function ManageConferencePage() {
  const session = await requireConferenceManagerPage("/dashboard/manage");

  const conferences = await getAdminConferences(session);
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <ConferenceManager conferences={conferences} />
    </Suspense>
  );
}
