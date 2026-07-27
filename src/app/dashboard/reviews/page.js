import { ConferenceAdminPicker } from "@/components/dashboard/ConferenceAdminPicker";
import { requireConferenceManagerPage } from "@/lib/auth/guards";
import { filterConferencesForAdminTab } from "@/lib/conferences/feature-visibility";
import { getAdminConferences } from "@/lib/conferences/service";

export const metadata = {
  title: "Evaluations & comments | NCDC Dashboard",
};

export default async function EvaluationsPage() {
  const session = await requireConferenceManagerPage("/dashboard/reviews");
  const conferences = filterConferencesForAdminTab(
    await getAdminConferences(session),
    "feedback",
  );

  return (
    <ConferenceAdminPicker
      title="Evaluations & comments"
      description="Select a conference to read feedback and evaluations from participants."
      tab="feedback"
      conferences={conferences}
    />
  );
}
