import { signedFetch } from "@/lib/auth/signedFetch";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const res = await signedFetch('/auth/google/login');

  const data = res.data as { url: string, state: string, verifierSt: string };

  if (!res.success) {
    return NextResponse.redirect(new URL(`${process.env.CLIENT_BASE}/auth/error?message${res.message}`));
  };

  const cookieStore = await cookies();
  const cookieMaxAge = 10 * 60;

  cookieStore.set("_o_s_session", data?.state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge,
  });

  cookieStore.set("_o_s_session_v", data?.verifierSt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge,
  });

  return NextResponse.redirect(data?.url);
}