import { NextResponse } from "next/server";
import { verifyCertificateByNumber } from "@/lib/certificates/service";
import { verifyTokenToCertificateNumber } from "@/lib/certificates/number";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const number =
    searchParams.get("n") ||
    searchParams.get("number") ||
    (searchParams.get("token")
      ? verifyTokenToCertificateNumber(searchParams.get("token"))
      : "");

  const result = await verifyCertificateByNumber(number);
  return NextResponse.json(result);
}
