import { redirect } from "next/navigation";

export default function MySubmissionsRedirectPage() {
  redirect("/dashboard/submit-paper");
}
