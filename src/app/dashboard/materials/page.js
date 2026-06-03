import { AttendeeConferencePicker } from "@/components/dashboard/AttendeeConferencePicker";
import { requirePermissionPage } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAttendeeRegistrationsForPicker } from "@/lib/registration/attendee-picker";

export const metadata = {
  title: "Conference materials | NCDC Conference Platform",
};

export default async function MaterialsPickerPage() {
  const session = await requirePermissionPage(
    PERMISSIONS.MY_MATERIALS,
    "/dashboard/materials",
  );

  const registrations = await getAttendeeRegistrationsForPicker(session.user.id);

  return (
    <AttendeeConferencePicker
      title="Conference materials"
      description="Choose a conference you have registered for to access materials and resources."
      emptyMessage="You have not registered for any conferences yet."
      emptyAction={{ label: "Browse conferences", href: "/conferences" }}
      registrations={registrations}
      target="materials"
    />
  );
}
