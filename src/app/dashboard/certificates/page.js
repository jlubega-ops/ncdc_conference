import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-routes";

export default async function CertificatesPage() {
  let session = null;
  try {
    session = await getCurrentSession();
  } catch {
    session = null;
  }

  if (!session) {
    redirect("/login?mode=access");
  }

  // Certificates now live on the conference's Certificate tab.
  redirect(getDefaultDashboardPath(session));
}
