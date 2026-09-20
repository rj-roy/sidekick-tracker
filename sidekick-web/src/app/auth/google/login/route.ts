import { signedFetch } from "@/lib/auth/signedFetch";
import { AuthRes } from "@/types/authResType";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const res = await signedFetch('/auth/google/login');

  const data = res.data as AuthRes;

  if (!res.success) {
    return NextResponse.redirect(new URL(`${process.env.CLIENT_BASE}/auth/error?message${res.message}`));
  };

  const cookieStore = await cookies();
  const cookieMaxAge = 10 * 60;

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: cookieMaxAge,
  };

  Object.entries(data.states).forEach(([name, value]) => {
    cookieStore.set(name, value, cookieOptions);
  });

  return NextResponse.redirect(data?.url);
}