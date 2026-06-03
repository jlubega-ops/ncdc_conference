import { ConferenceAdminPicker } from "@/components/dashboard/ConferenceAdminPicker";
import { requireConferenceManagerPage } from "@/lib/auth/guards";
import { getAdminConferences } from "@/lib/conferences/service";

export const metadata = {
  title: "Evaluations & comments | NCDC Dashboard",
};

export default async function EvaluationsPage() {
  const session = await requireConferenceManagerPage("/dashboard/reviews");
  const conferences = await getAdminConferences(session);

  return (
    <ConferenceAdminPicker
      title="Evaluations & comments"
      description="Select a conference to read feedback and evaluations from participants."
      tab="feedback"
      conferences={conferences}
    />
  );
}
