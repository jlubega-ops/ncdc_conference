import { redirect } from "next/navigation";
import { ProfilePage } from "@/components/dashboard/ProfilePage";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata = {
  title: "Profile | NCDC Dashboard",
};

export default async function DashboardProfilePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?redirect=/dashboard/profile&reason=session_expired");

  return <ProfilePage />;
}
