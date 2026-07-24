import { HomeLanding } from "@/components/home/HomeLanding";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";

export const metadata = {
  title: "Conference Management",
  description:
    "Discover open conferences, register for events, and manage programmes from one place.",
};

export default async function HomePage() {
  await redirectIfAuthenticated();
  return <HomeLanding />;
}
