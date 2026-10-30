import { signedFetch } from "@/lib/server/signedFetch";
import { isTrustedExtension } from "@/lib/server/extensionAuth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    if (!isTrustedExtension(req)) {
        return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 });
    };

    const res = await signedFetch("/auth/get/session");

    return NextResponse.json(res, {
        status: res.success ? 201 : 401,
    });
};