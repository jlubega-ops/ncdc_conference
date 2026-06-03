import { ReviewerAssignedPapers } from "@/components/dashboard/ReviewerAssignedPapers";
import { requireReviewerPage } from "@/lib/auth/guards";

export const metadata = {
  title: "Assigned papers | NCDC Dashboard",
};

export default async function ReviewerPapersPage() {
  await requireReviewerPage("/dashboard/reviewer/papers");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Assigned papers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review, approve, or request improvements on papers assigned to you.
        </p>
      </div>
      <ReviewerAssignedPapers />
    </div>
  );
}
