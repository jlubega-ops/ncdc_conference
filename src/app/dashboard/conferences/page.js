import { redirect } from "next/navigation";

export default function DashboardConferencesRedirect() {
  redirect("/dashboard/manage");
}
