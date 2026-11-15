import { signedFetch } from "@/lib/server/signedFetch";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const res = await signedFetch("/tracking/get", req, {
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
    message: res.message ?? "Tracked emails fetched",
    ...(res.data ? { data: res.data } : {}),
  });
}
