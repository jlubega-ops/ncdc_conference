import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";

export default async function MyRegistrationsPage() {
  let session = null;
  try {
    session = await getCurrentSession();
  } catch {
    session = null;
  }

  if (!session) {
    redirect("/access");
  }

  // Attendees now manage everything from their conference tabs.
  redirect(getDefaultDashboardPath(session));
}
