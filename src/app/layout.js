import { Geist, Geist_Mono } from "next/font/google";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { OrganiserBrandProvider } from "@/components/layout/OrganiserBrandProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { brandAssets } from "@/lib/assets";
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
  icons: {
    icon: brandAssets.logo,
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans" suppressHydrationWarning>
        <OrganiserBrandProvider>
          <SessionProvider>
            <SiteChrome>{children}</SiteChrome>
            <ToastProvider />
          </SessionProvider>
        </OrganiserBrandProvider>
      </body>
    </html>
  );
}
