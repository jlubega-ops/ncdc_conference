import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
  title: "NCDC Conference Management",
  description:
    "Conference management system for the National Curriculum Development Centre, Uganda",
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
    >
      <body className="min-h-full flex flex-col font-sans">
        <SessionProvider initialSession={initialSession}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ToastProvider />
        </SessionProvider>
      </body>
    </html>
  );
}
