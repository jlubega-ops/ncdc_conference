import { FileText, Calendar, UserPlus, GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const actions = [
  {
    title: "Submit Paper",
    description: "Sign in with your email and password to submit or manage papers.",
    icon: FileText,
    href: "/login",
    cta: "Sign in",
    buttonVariant: "primary",
  },
  {
    title: "Register as Attendee",
    description: "Register for a conference or sign in to track your applications.",
    icon: UserPlus,
    href: "/conferences",
    cta: "Register",
    buttonVariant: "primary",
  },
  {
    title: "Browse Conferences",
    description: "Explore all upcoming, active, and completed conferences.",
    icon: Calendar,
    href: "/conferences",
    cta: "Browse",
    buttonVariant: "secondary",
  },
  {
    title: "Access Conference Material",
    description: "Open conference resources, programmes, and essential documents.",
    icon: GraduationCap,
    href: "/resources",
    cta: "Open resources",
    buttonVariant: "secondary",
  },
];

export function QuickActions() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">
          What would you like to do?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick access to the most common tasks on the platform.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action) => (
            <article
              key={action.title}
              className="flex h-full min-h-[180px] flex-col rounded-lg border border-border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <div className="flex flex-1 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
                  <Icon icon={action.icon} size="md" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{action.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant={action.buttonVariant}
                  size="md"
                  href={action.href}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="w-full justify-between"
                >
                  {action.cta}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
