import { signedFetch } from "@/lib/server/signedFetch";
import { isTrustedExtension } from "@/lib/server/extensionAuth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  if (!isTrustedExtension(req)) {
    return NextResponse.json(
      { success: false, message: "unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Missing userId" },
      { status: 400 },
    );
  }

  const res = await signedFetch(
    `/tracking/get?userId=${encodeURIComponent(userId)}`,
    req,
    {
      method: "GET",
      redirectOnAuthError: false,
    },
  );

  if (!res.success) {
    return NextResponse.json(
      { success: false, message: res.message },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    message: res.message ?? "Mail fetched",
    ...(res.data ? { data: res.data } : {}),
  });
}
