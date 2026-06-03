import { AttendeeConferencePicker } from "@/components/dashboard/AttendeeConferencePicker";
import { requirePermissionPage } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAttendeeRegistrationsForPicker } from "@/lib/registration/attendee-picker";

export const metadata = {
  title: "Submit paper | NCDC Conference Platform",
};

export default async function SubmitPaperPage() {
  const session = await requirePermissionPage(
    PERMISSIONS.SUBMIT_PAPER,
    "/dashboard/submit-paper",
  );

  const registrations = await getAttendeeRegistrationsForPicker(session.user.id, {
    approvedOnly: true,
  });

  return (
    <AttendeeConferencePicker
      title="Submit paper"
      description="Choose a conference where your registration is approved, then complete the submission form."
      emptyMessage="You need an approved registration before you can submit a paper."
      emptyAction={{ label: "View my registrations", href: "/dashboard/my-registrations" }}
      registrations={registrations}
      target="papers"
    />
  );
}
