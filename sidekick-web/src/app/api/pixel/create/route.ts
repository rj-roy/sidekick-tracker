import { signedFetch } from "@/lib/server/signedFetch";
import { isTrustedExtension } from "@/lib/server/extensionAuth";
import { pixelUrlFor } from "@/lib/pixel";
import { NextResponse } from "next/server";

interface CreatePixelBody {
    subject?: string;
    recipientCount?: number;
}

const readBody = async (req: Request): Promise<CreatePixelBody> => {
    try {
        const body = (await req.json()) as CreatePixelBody;

        return {
            ...(typeof body.subject === "string" ? { subject: body.subject } : {}),
            ...(typeof body.recipientCount === "number" ? { recipientCount: body.recipientCount } : {}),
        };

    } catch {
        return {};
    }
};

export async function POST(req: Request) {
    if (!isTrustedExtension(req)) {
        return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 });
    };

    const res = await signedFetch<{ token: string }>("/tracking/create", {
        method: "POST",
        body: await readBody(req),
        redirectOnAuthError: false,
    });

    if (!res.success || !res.data?.token) {
        return NextResponse.json(
            { success: false, message: res.message || "Failed to create tracking pixel" },
            { status: res.success ? 502 : 401 }
        );
    };

    return NextResponse.json({
        success: true,
        message: "Tracking pixel created",
        data: {
            token: res.data.token,
            pixelUrl: pixelUrlFor(res.data.token),
        },
    });
};
