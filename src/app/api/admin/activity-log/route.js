import { NextResponse } from "next/server";
import { authorizeSuperadmin } from "@/lib/auth/guards";
import { listActivityLogs } from "@/lib/activity-log/service";
import { jsonNoStore } from "@/lib/http/no-store";

export async function GET(request) {
  const access = await authorizeSuperadmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
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

    return jsonNoStore(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load activity log.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
