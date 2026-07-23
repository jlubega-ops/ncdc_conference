import { Mail, MapPin, Phone } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

export const metadata = {
  title: "Contact | Conference Management",
  description: "Contact the Conference Management support team.",
};

export default function ContactPage() {
  return (
    <div className="bg-background">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-bold text-foreground">Contact</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Get in touch for registration support, submissions, or general platform enquiries.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground">Contact details</h2>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <Icon icon={MapPin} size="sm" className="mt-0.5 text-primary" />
                <span>Conference Management support desk</span>
              </li>
              <li className="flex items-center gap-3">
                <Icon icon={Mail} size="sm" className="text-primary" />
                <a href="mailto:support@example.com" className="hover:text-primary">
                  support@example.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Icon icon={Phone} size="sm" className="text-primary" />
                <span>+256 000 000000</span>
              </li>
            </ul>
          </section>

          <section
            id="support"
            className="scroll-mt-24 rounded-lg border border-border bg-surface p-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Support</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              For help with signing in, registration status, or conference codes, email support with
              your full name and the conference you are attending. Organisers can assist with
              event-specific questions from the conference contact details on each event page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
