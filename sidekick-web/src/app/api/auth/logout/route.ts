import { signedFetch } from "@/lib/server/signedFetch";
import { isTrustedExtension } from "@/lib/server/extensionAuth";
import { deleteCookie } from "@/lib/cookies";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!isTrustedExtension(req)) {
    return NextResponse.json(
      { success: false, message: "unauthorized" },
      { status: 401 },
    );
  }

  const res = await signedFetch("/auth/logout", req, { method: "POST" });

  await deleteCookie("OG_L");
  await deleteCookie("T_ls_");

  return NextResponse.json(res, {
    status: res.success ? 200 : 401,
  });
}
