import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ConferenceManager } from "@/components/dashboard/ConferenceManager";
import { requireConferenceManager } from "@/lib/auth/guards";
import { getAdminConferences } from "@/lib/conferences/service";

export default async function ManageConferencePage() {
  const session = await requireConferenceManager();
  if (!session) {
    redirect("/login?redirect=/dashboard/manage");
  }

  const conferences = await getAdminConferences(session);
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <ConferenceManager conferences={conferences} />
    </Suspense>
  );
}
