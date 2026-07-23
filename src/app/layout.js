import { Geist, Geist_Mono } from "next/font/google";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { getCurrentSession } from "@/lib/auth/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Conference Management",
  description:
    "Discover open conferences, register for events, and manage programmes from one place.",
};

export default async function RootLayout({ children }) {
  let initialSession = null;
  try {
    initialSession = await getCurrentSession();
  } catch {
    initialSession = null;
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <SessionProvider initialSession={initialSession}>
          <SiteChrome>{children}</SiteChrome>
          <ToastProvider />
        </SessionProvider>
      </body>
    </html>
  );
}
