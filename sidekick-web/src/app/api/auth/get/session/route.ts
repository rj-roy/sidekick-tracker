import { signedFetch } from "@/lib/auth/signedFetch";
import { NextResponse } from "next/server";

export async function GET() {
    const res = await signedFetch("/auth/get/session");

    return NextResponse.json(res, {
        status: res.success ? 200 : 401,
    });
};