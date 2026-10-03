import { signedFetch } from "@/lib/server/signedFetch";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const isExtension = req.headers.get('x-client-type')

    if (isExtension === "extension") {
        const exId = req.headers.get("x-extension-id");

        if (exId !== process.env.EXTENSION_ID) {
            return NextResponse.json({status: 401, message: "unauthorized"});
        };
    };

    const res = await signedFetch("/auth/get/session");

    return NextResponse.json(res, {
        status: res.success ? 201 : 401,
    });
};