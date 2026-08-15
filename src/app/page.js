import { HomeLanding } from "@/components/home/HomeLanding";
import { RedirectIfAuthenticatedClient } from "@/components/auth/RedirectIfAuthenticatedClient";

export const metadata = {
  title: "Conference Management",
  description:
    "Discover open conferences, register for events, and manage programmes from one place.",
};

export default function HomePage() {
  return (
    <>
      <RedirectIfAuthenticatedClient />
      <HomeLanding />
    </>
  );
}
