import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConferenceAdminSubmissionsTab } from "@/components/dashboard/admin-tabs/ConferenceAdminSubmissionsTab";
import { requireConferenceManagerPage } from "@/lib/auth/guards";
import { getConferenceByIdForAdmin } from "@/lib/conferences/service";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const conference = await getConferenceByIdForAdmin(id);
  return {
    title: conference
      ? `Submissions — ${conference.title}`
      : "Submissions | NCDC Dashboard",
  };
}

export default async function ConferenceSubmissionsPage({ params }) {
  const session = await requireConferenceManagerPage("/dashboard/submissions");
  const { id } = await params;
  const conference = await getConferenceByIdForAdmin(id, session);
  if (!conference) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" icon={ArrowLeft} href="/dashboard/submissions">
        Back to paper submissions
      </Button>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{conference.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paper submissions</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        <ConferenceAdminSubmissionsTab conferenceId={conference.id} />
      </div>
    </div>
  );
}
