import {
  Calendar,
  MapPin,
  Users,
  FileText,
  Bell,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/theme/tokens";

const swatches = [
  { name: "Primary", value: colors.primary.DEFAULT, text: "#fff" },
  { name: "Primary Dark", value: colors.primary.dark, text: "#fff" },
  { name: "Primary Light", value: colors.primary.light, text: colors.neutral[800] },
  { name: "Primary Muted", value: colors.primary.muted, text: colors.neutral[800] },
  { name: "Foreground", value: colors.neutral[800], text: "#fff" },
  { name: "Muted", value: colors.neutral[500], text: "#fff" },
  { name: "Border", value: colors.neutral[300], text: colors.neutral[800] },
  { name: "Background", value: colors.surface.subtle, text: colors.neutral[800] },
  { name: "Success", value: colors.semantic.success, text: "#fff" },
  { name: "Warning", value: colors.semantic.warning, text: "#fff" },
  { name: "Error", value: colors.semantic.error, text: "#fff" },
  { name: "Info", value: colors.semantic.info, text: "#fff" },
];

export const metadata = {
  title: "Theme Preview | NCDC Conference",
  description: "Design system preview for the NCDC Conference Management System",
};

export default function ThemePage() {
  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-primary">NCDC Conference</p>
            <h1 className="text-2xl font-semibold text-foreground">
              Design System
            </h1>
          </div>
          <Button variant="primary" icon={Calendar} size="sm">
            Sample action
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Colors</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {swatches.map((swatch) => (
              <div
                key={swatch.name}
                className="overflow-hidden rounded-lg border border-border"
              >
                <div
                  className="flex h-16 items-end p-3"
                  style={{ backgroundColor: swatch.value, color: swatch.text }}
                >
                  <span className="text-xs font-medium">{swatch.name}</span>
                </div>
                <div className="bg-surface px-3 py-2">
                  <code className="text-xs text-muted-foreground">
                    {swatch.value}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Typography
          </h2>
          <div className="space-y-3 rounded-lg border border-border bg-surface p-6">
            <p className="text-4xl font-bold text-foreground">Heading 1</p>
            <p className="text-3xl font-semibold text-foreground">Heading 2</p>
            <p className="text-2xl font-semibold text-foreground">Heading 3</p>
            <p className="text-lg text-foreground">
              Body large — conference schedules, session descriptions.
            </p>
            <p className="text-base text-foreground">
              Body — default paragraph text for forms and content.
            </p>
            <p className="text-sm text-muted-foreground">
              Caption — timestamps, helper text, metadata.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Buttons
          </h2>
          <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-surface p-6">
            <Button variant="primary" icon={Calendar}>
              Register
            </Button>
            <Button variant="secondary">Manage sessions</Button>
            <Button variant="outline">View agenda</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Remove</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Icons</h2>
          <div className="flex flex-wrap gap-6 rounded-lg border border-border bg-surface p-6">
            {[
              { icon: Calendar, label: "Calendar" },
              { icon: MapPin, label: "Location" },
              { icon: Users, label: "Attendees" },
              { icon: FileText, label: "Documents" },
              { icon: Bell, label: "Notifications" },
              { icon: Settings, label: "Settings" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div className="flex size-10 items-center justify-center rounded-md bg-primary-light text-primary">
                  <Icon icon={icon} size="md" />
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Sample card
          </h2>
          <article className="max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
            <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-primary-light px-2.5 py-1 text-xs font-medium text-primary">
              <Icon icon={Calendar} size="sm" />
              Aug 20–21, 2026
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              International Conference on Curriculum Development
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Innovative curriculum approaches for sustainable education in a
              globalised world.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Icon icon={MapPin} size="sm" />
              Speke Resort Munyonyo, Kampala
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="primary" size="sm">
                Register now
              </Button>
              <Button variant="outline" size="sm">
                Learn more
              </Button>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
