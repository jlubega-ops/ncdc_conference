import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";
import { requirePermissionPage } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function AccessKeysPage() {
  await requirePermissionPage(PERMISSIONS.ACCESS_KEYS, "/dashboard/access-keys");

  return (
    <PlaceholderPage
      title="Access Keys"
      description="Generate and manage conference access keys sent by email."
    />
  );
}
