import { signedFetch } from "@/lib/server/signedFetch";
import { isTrustedExtension } from "@/lib/server/extensionAuth";
import { NextResponse } from "next/server";

interface MarkSentBody {
    recipient: string[];
    trackingToken?: string;
    subject?: string;
    sentAt?: number;
};

export async function POST(req: Request) {
    if (!isTrustedExtension(req)) {
        return NextResponse.json({ success: false, message: "unauthorized" }, { status: 406 });
    }

    const body = (await req.json().catch(() => ({}))) as MarkSentBody;

    if (!body.trackingToken) {
        return NextResponse.json({ success: false, message: "Missing tracking token" }, { status: 400 });
    }

    const res = await signedFetch("/tracking/sent", {
        method: "POST",
        body: {
            trackingToken: body.trackingToken,
            recipient: body.recipient ?? [],
            ...(typeof body.subject === "string" ? { subject: body.subject } : {}),
            ...(typeof body.sentAt === "number" ? { sentAt: body.sentAt } : {}),
        },
        redirectOnAuthError: false,
    });

    if (!res.success) {
        return NextResponse.json({ success: false, message: res.message }, { status: 401 });
    }

    return NextResponse.json({
        success: true,
        message: res.message ?? "Tracking marked as sent",
        ...(res.data ? { data: res.data } : {}),
    });
}