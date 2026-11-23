import { signedFetch } from "@/lib/server/signedFetch";
import { NextResponse } from "next/server";

export async function GET() {
  const res = await signedFetch("/auth/get/session", undefined, {
    method: "GET",
    redirectOnAuthError: false,
  });

  if (!res.success) {
    return NextResponse.json(
      { success: false, message: res.message },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    message: res.message ?? "Session fetched",
    ...(res.data ? { data: res.data } : {}),
  });
}
