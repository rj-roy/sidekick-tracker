import { signedFetch } from "@/lib/auth/signedFetch";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const error = url.searchParams.get("error");

    if (error) {
        return NextResponse.redirect(new URL(`${process.env.CLIENT_BASE}/auth/error?message=${error}`));
    };

    const cookieStore = await cookies();
    const cookieNames = ["__u__lt", "_ms__i", "_og_l", "b_al_l", "o_bh_h",];

    const cookieValues = Object.fromEntries(
        cookieNames.map((name) => [name, cookieStore.get(name)?.value])
    );

    if (cookieNames.some((name) => !cookieValues[name])) {
        return NextResponse.redirect(new URL(`${process.env.CLIENT_BASE}/auth/error?message=Failed-to-retrive-cookies`))
    };

    const paramsState = url.searchParams.get("state");
    const paramsCode = url.searchParams.get("code");

    const res = await signedFetch
        <{ user: Record<string, string>, sessionCookies: Record<string, string> }>
        ('/auth/google/callback', {
            method: "POST",
            body: {
                paramsState,
                paramsCode,
                __u__lt: cookieValues.__u__lt,
                _ms__i: cookieValues._ms__i,
                _og_l: cookieValues._og_l,
                b_al_l: cookieValues.b_al_l,
                o_bh_h: cookieValues.o_bh_h,
            },
        });

    for (const name of cookieNames) {
        cookieStore.delete(name);
    };

    if (!res.success) {
        return NextResponse.redirect(new URL(`${process.env.CLIENT_BASE}/auth/error?message=server-error`));
    };

    const cookieMaxAge = 10 * 60 * 1000;
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: cookieMaxAge,
    };

    Object.entries(res.data?.sessionCookies ?? {}).forEach(([name, value]) => {
        cookieStore.set(name, value, cookieOptions)
    });

    return NextResponse.redirect(new URL(`${process.env.CLIENT_BASE}/auth/success?user=${res.data?.user.name}`));
};