import { NextResponse } from "next/server";
import { getRegistrableConferences } from "@/lib/conferences/registrable";

export async function GET() {
  try {
    const conferences = await getRegistrableConferences();
    return NextResponse.json({ conferences });
  } catch (err) {
    console.error("Registrable conferences error:", err);
    return NextResponse.json({ conferences: [] });
  }
}
