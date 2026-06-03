import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

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

  return <DashboardHome session={session} />;
}
