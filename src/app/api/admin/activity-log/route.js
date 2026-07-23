import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/guards";
import { listActivityLogs } from "@/lib/activity-log/service";

export async function GET(request) {
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const successParam = searchParams.get("success");
    let success = null;
    if (successParam === "true") success = true;
    if (successParam === "false") success = false;

    const data = await listActivityLogs({
      q: searchParams.get("q") || "",
      action: searchParams.get("action") || "",
      actorId: searchParams.get("actorId") || "",
      conferenceId: searchParams.get("conferenceId") || "",
      success,
      limit: Number(searchParams.get("limit") || 50),
      offset: Number(searchParams.get("offset") || 0),
    });

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load activity log.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
