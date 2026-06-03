import { ConferenceAdminPicker } from "@/components/dashboard/ConferenceAdminPicker";
import { requireConferenceManagerPage } from "@/lib/auth/guards";
import { getAdminConferences } from "@/lib/conferences/service";

export const metadata = {
  title: "Paper submissions | NCDC Dashboard",
};

export default async function PaperSubmissionsPage() {
  const session = await requireConferenceManagerPage("/dashboard/submissions");
  const conferences = await getAdminConferences(session);

  return (
    <ConferenceAdminPicker
      title="Paper submissions"
      description="Select a conference to view submitted papers and authors."
      tab="submissions"
      conferences={conferences}
    />
  );
}
