"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/**
 * Site chrome (nav + footer) for public pages.
 * Home is a full-screen landing without chrome.
 * Dashboard fills the viewport: header fixed, main scrolls internally (no page scroll).
 */
export function SiteChrome({ children }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (isHome) {
    return (
      <main className="h-dvh max-h-dvh flex-1 overflow-hidden">{children}</main>
    );
  }

  if (isDashboard) {
    return (
      <div className="flex h-dvh max-h-dvh flex-col overflow-hidden">
        <Header />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
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
