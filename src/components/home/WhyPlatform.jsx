import {
  FileText,
  ClipboardCheck,
  MessageSquare,
  UserPlus,
  Calendar,
  Award,
  Settings,
  Users,
  BarChart3,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";

const audiences = [
  {
    title: "For Researchers",
    icon: FileText,
    items: [
      { icon: FileText, text: "Submit papers" },
      { icon: ClipboardCheck, text: "Track reviews" },
      { icon: MessageSquare, text: "Receive feedback" },
    ],
  },
  {
    title: "For Attendees",
    icon: UserPlus,
    items: [
      { icon: UserPlus, text: "Register online" },
      { icon: Calendar, text: "Access programmes" },
      { icon: Award, text: "Download certificates" },
    ],
  },
  {
    title: "For Organizers",
    icon: Settings,
    items: [
      { icon: Settings, text: "Manage conferences" },
      { icon: Users, text: "Assign reviewers" },
      { icon: BarChart3, text: "Generate reports" },
    ],
  },
];

export function WhyPlatform() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">
          Why Use This Platform
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One platform for every role in the conference lifecycle.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {audiences.map((group) => (
            <div
              key={group.title}
              className="rounded-lg border border-border bg-background p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-primary-light text-primary">
                  <Icon icon={group.icon} size="md" />
                </div>
                <h3 className="font-semibold text-foreground">{group.title}</h3>
              </div>
              <ul className="mt-5 space-y-3">
                {group.items.map((item) => (
                  <li key={item.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Icon icon={item.icon} size="sm" className="text-primary" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
