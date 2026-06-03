import { MyRegistrationsList } from "@/components/dashboard/MyRegistrationsList";
import { requirePermissionPage } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export const metadata = {
  title: "My Registrations | NCDC Conference Platform",
};

export default async function MyRegistrationsPage() {
  await requirePermissionPage(PERMISSIONS.MY_REGISTRATIONS, "/dashboard/my-registrations");
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">My registrations</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Conferences you have applied to attend, with approval status and organiser feedback.
      </p>
      <div className="mt-6">
        <MyRegistrationsList />
      </div>
    </div>
  );
}
