"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/**
 * Site chrome (nav + footer) for public pages.
 * Home is a full-screen landing without chrome.
 */
export function SiteChrome({ children }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (isHome) {
    return (
      <main className="h-dvh max-h-dvh flex-1 overflow-hidden">{children}</main>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
