import { AttendeeConferencePicker } from "@/components/dashboard/AttendeeConferencePicker";
import { requirePermissionPage } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAttendeeRegistrationsForPicker } from "@/lib/registration/attendee-picker";

export const metadata = {
  title: "Programme | NCDC Conference Platform",
};

export default async function ProgrammePickerPage() {
  const session = await requirePermissionPage(
    PERMISSIONS.MY_PROGRAMME,
    "/dashboard/programme",
  );

  const registrations = await getAttendeeRegistrationsForPicker(session.user.id);

  return (
    <AttendeeConferencePicker
      title="Programme"
      description="Choose a conference you have registered for to view the programme. Some details may only appear after your registration is approved."
      emptyMessage="You have not registered for any conferences yet."
      emptyAction={{ label: "Browse conferences", href: "/conferences" }}
      registrations={registrations}
      target="programme"
    />
  );
}
