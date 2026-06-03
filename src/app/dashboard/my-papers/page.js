import Link from "next/link";
import { MyPapersList } from "@/components/dashboard/MyPapersList";
import { requirePermissionPage } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export const metadata = {
  title: "My Papers | NCDC Conference Platform",
};

export default async function MyPapersPage() {
  await requirePermissionPage(PERMISSIONS.MY_PAPERS, "/dashboard/my-papers");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My papers</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            All papers you have submitted across conferences.
          </p>
        </div>
        <Link
          href="/dashboard/submit-paper"
          className="text-sm font-medium text-primary hover:underline"
        >
          Submit a new paper →
        </Link>
      </div>
      <div className="mt-6">
        <MyPapersList />
      </div>
    </div>
  );
}
