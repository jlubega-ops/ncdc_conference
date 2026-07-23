import { ActivityLogAdmin } from "@/components/dashboard/ActivityLogAdmin";
import { requireSuperadminPage } from "@/lib/auth/guards";

export const metadata = {
  title: "Activity log | NCDC Dashboard",
};

export default async function ActivityLogPage() {
  await requireSuperadminPage("/dashboard/activity-log");

  return <ActivityLogAdmin />;
}
