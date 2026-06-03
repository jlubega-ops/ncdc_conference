import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { resources } from "@/lib/data/resources";

export function ResourcesSection() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">Resources</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Templates, guidelines, and policies for conference participants.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <article
              key={resource.id}
              className="flex flex-col rounded-lg border border-border bg-background p-5"
            >
              <div className="flex size-10 items-center justify-center rounded-md bg-primary-light text-primary">
                <Icon icon={resource.icon} size="md" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {resource.title}
              </h3>
              <p className="mt-1 flex-1 text-xs text-muted-foreground">
                {resource.description}
              </p>
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                href={resource.href}
                className="mt-4 w-fit"
              >
                Download
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
