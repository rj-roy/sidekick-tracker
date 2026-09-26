import { signedFetch } from "@/lib/auth/signedFetch";
import { setCookie } from "@/lib/cookies";
import { AuthRes } from "@/types/authTypes";
import { NextResponse } from "next/server";

export async function GET() {
  const res = await signedFetch('/auth/google/login');

  const data = res.data as AuthRes;

  if (!res.success) {
    return NextResponse.redirect(new URL(`${process.env.CLIENT_BASE}/auth/error?message${res.message}`));
  };

  const cookieMaxAge = 10 * 60;

  Object.entries(data.states).forEach(async ([name, value]) => {
    await setCookie(name, value, cookieMaxAge)
  });

  return NextResponse.redirect(data?.url);
};