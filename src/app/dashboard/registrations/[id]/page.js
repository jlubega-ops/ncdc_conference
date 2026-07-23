import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConferenceAdminRegistrationsTab } from "@/components/dashboard/admin-tabs/ConferenceAdminRegistrationsTab";
import { requireConferenceManagerPage } from "@/lib/auth/guards";
import { getConferenceByIdForAdmin } from "@/lib/conferences/service";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const conference = await getConferenceByIdForAdmin(id);
  return {
    title: conference
      ? `Registrations — ${conference.title}`
      : "Registrations | NCDC Dashboard",
  };
}

export default async function ConferenceRegistrationsPage({ params }) {
  const session = await requireConferenceManagerPage("/dashboard/registrations");
  const { id } = await params;
  const conference = await getConferenceByIdForAdmin(id, session);
  if (!conference) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" icon={ArrowLeft} href="/dashboard/registrations">
        Back to registrations
      </Button>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{conference.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registrations
          {conference.reference ? ` · Ref ${conference.reference}` : ""}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        <ConferenceAdminRegistrationsTab
          conferenceId={conference.id}
          registrationMode={conference.registrationMode}
        />
      </div>
    </div>
  );
}
