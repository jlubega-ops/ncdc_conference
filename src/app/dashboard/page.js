import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { getDashboardOverview } from "@/lib/dashboard/overview";
import { getCurrentSession } from "@/lib/auth/session";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Overview | NCDC Dashboard",
};

export default async function DashboardPage() {
  let session = null;
  try {
    session = await getCurrentSession();
  } catch {
    session = null;
  }

  if (!session) {
    redirect("/login");
  }

  // Attendees live entirely on their conference tabs — no dashboard overview.
  if (session.activeRole === "ATTENDEE") {
    redirect(getDefaultDashboardPath(session));
  }

  const overview = await getDashboardOverview(session);

  return <DashboardOverview session={session} data={overview} />;
}
