import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";

export default async function AttendancePage() {
  let session = null;
  try {
    session = await getCurrentSession();
  } catch {
    session = null;
  }

  if (!session) {
    redirect("/access");
  }

  // Attendance now lives on the conference's Attendance tab.
  redirect(getDefaultDashboardPath(session));
}
