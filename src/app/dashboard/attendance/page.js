import { redirect } from "next/navigation";
import { AttendanceRunningList } from "@/components/dashboard/AttendanceRunningList";
import { getSessionRecord } from "@/lib/auth/session";

export const metadata = {
  title: "Attendance | NCDC Dashboard",
};

export default async function AttendancePage() {
  const session = await getSessionRecord();
  if (!session) redirect("/login?redirect=/dashboard/attendance");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Attendance</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Register your attendance for conferences running today. Check-in is only available on the
        scheduled day, within that day&apos;s time window (e.g. Day 2, 9:00–17:00).
      </p>
      <AttendanceRunningList />
    </div>
  );
}
