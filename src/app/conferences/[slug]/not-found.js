import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ConferenceNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-foreground">Conference Not Found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The conference you are looking for does not exist or may have been
          removed.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="primary" href="/conferences">
            Browse Conferences
          </Button>
          <Button variant="outline" href="/">
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
