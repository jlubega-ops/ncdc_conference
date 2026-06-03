import { UsersAdmin } from "@/components/dashboard/UsersAdmin";
import { requireSuperadminPage } from "@/lib/auth/guards";

export const metadata = {
  title: "Users | NCDC Dashboard",
};

export default async function UsersPage() {
  await requireSuperadminPage("/dashboard/users");

  return <UsersAdmin />;
}
