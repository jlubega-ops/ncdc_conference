import { redirect } from "next/navigation";
import { AttendanceConferenceView } from "@/components/dashboard/AttendanceConferenceView";
import { getSessionRecord } from "@/lib/auth/session";

export const metadata = {
  title: "Conference attendance | NCDC Dashboard",
};

export default async function AttendanceConferencePage({ params }) {
  const session = await getSessionRecord();
  if (!session) redirect("/login?redirect=/dashboard/attendance");

  const { slug } = await params;

  return <AttendanceConferenceView slug={slug} />;
}
