import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/guards";
import { deleteUserByAdmin, updateUserByAdmin } from "@/lib/users/service";

export async function PATCH(request, { params }) {
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updateUserByAdmin(id, body);
    if (result.errors) {
      return NextResponse.json({ errors: result.errors, error: "Validation failed." }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update user.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request, { params }) {
  const session = await requireSuperadmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await deleteUserByAdmin(id, session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete user.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
