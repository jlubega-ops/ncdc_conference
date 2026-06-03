import { Mail, MapPin, Phone } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

export const metadata = {
  title: "Contact | NCDC Conference Platform",
  description: "Contact the NCDC Conference Management Platform team.",
};

export default function ContactPage() {
  return (
    <div className="bg-background">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-bold text-foreground">Contact</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Get in touch with the NCDC conference team for registration, submissions,
            or general enquiries.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground">Contact Details</h2>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <Icon icon={MapPin} size="sm" className="mt-0.5 text-primary" />
                <span>
                  National Curriculum Development Centre
                  <br />
                  Kyambogo, Kampala, Uganda
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Icon icon={Mail} size="sm" className="text-primary" />
                <a href="mailto:conferences@ncdc.go.ug" className="hover:text-primary">
                  conferences@ncdc.go.ug
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Icon icon={Phone} size="sm" className="text-primary" />
                <span>+256 414 597 597</span>
              </li>
            </ul>
          </section>

          <section id="support" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground">Support</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              For technical support with the platform, paper submissions, or
              registration issues, email our support team at{" "}
              <a href="mailto:support@ncdc.go.ug" className="text-primary hover:underline">
                support@ncdc.go.ug
              </a>
              . We aim to respond within two business days.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
