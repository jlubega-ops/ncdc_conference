import { redirect } from "next/navigation";
import { ReportsDashboard } from "@/components/dashboard/ReportsDashboard";
import { getCurrentSession } from "@/lib/auth/session";
import { canAccessReports } from "@/lib/reports/access";

export const metadata = {
  title: "Reports | NCDC Dashboard",
};

export default async function ReportsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?redirect=/dashboard/reports");

  if (!canAccessReports(session)) {
    redirect("/dashboard");
  }

  return <ReportsDashboard initialRole={session.activeRole} />;
}
