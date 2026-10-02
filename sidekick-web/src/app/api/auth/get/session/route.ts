import { signedFetch } from "@/lib/server/signedFetch";
import { NextResponse } from "next/server";

export async function GET() {
    const res = await signedFetch("/auth/get/session");

    return NextResponse.json(res, {
        status: res.success ? 201 : 401,
    });
};