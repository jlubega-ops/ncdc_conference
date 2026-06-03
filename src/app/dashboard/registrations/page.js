import { ConferenceAdminPicker } from "@/components/dashboard/ConferenceAdminPicker";
import { requireConferenceManagerPage } from "@/lib/auth/guards";
import { getAdminConferences } from "@/lib/conferences/service";

export const metadata = {
  title: "Registrations | NCDC Dashboard",
};

export default async function RegistrationsPage() {
  const session = await requireConferenceManagerPage("/dashboard/registrations");
  const conferences = await getAdminConferences(session);

  return (
    <ConferenceAdminPicker
      title="Registrations"
      description="Select a conference to view and activate attendee registrations."
      tab="registrations"
      conferences={conferences}
    />
  );
}
