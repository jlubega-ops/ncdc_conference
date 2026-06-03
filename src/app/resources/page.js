import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { resources } from "@/lib/data/resources";

export const metadata = {
  title: "Resources | NCDC Conference Platform",
  description: "Download paper templates, guidelines, and conference policies.",
};

export default function ResourcesPage() {
  return (
    <div className="bg-background">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-bold text-foreground">Resources</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Templates, author and reviewer guidelines, presentation materials,
            and conference policies for all platform users.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
        {resources.map((resource) => (
          <section
            key={resource.id}
            id={resource.id}
            className="scroll-mt-24 rounded-lg border border-border bg-surface p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
                  <Icon icon={resource.icon} size="md" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {resource.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {resource.description}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" icon={Download}>
                Download
              </Button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
