import { signedFetch } from "@/lib/auth/signedFetch";
import { deleteCookie, getCookie, setCookie } from "@/lib/cookies";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const error = url.searchParams.get("error");

    if (error) {
        return NextResponse.redirect(new URL(`${process.env.CLIENT_BASE}/auth/error?message=${error}`));
    };

    const cookieNames = ["_ms__i", "o_bh_h",];

    const cookieValues = Object.fromEntries(
        await Promise.all(cookieNames.map(async (name) => [name, await getCookie(name)] as const))
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
                _ms__i: cookieValues._ms__i,
                o_bh_h: cookieValues.o_bh_h,
            },
        });

    console.log(res, 'resll');

    for (const name of cookieNames) {
        await deleteCookie(name);
    };

    if (!res.success) {
        return NextResponse.redirect(new URL(`${process.env.CLIENT_BASE}/auth/error?message=server-error`));
    };

    const { OG_L, T_ls_ } = res.data?.sessionCookies ?? {};

    const cookieMaxAge = 10 * 60 * 1000;

    if (!OG_L || !T_ls_) {
        return NextResponse.redirect(new URL(`${process.env.CLIENT_BASE}/auth/error?message=Faild to Retrive Cookies`));
    };

    Object.entries(res.data?.sessionCookies ?? {}).forEach(async ([name, value]) => {
        await setCookie(name, value, cookieMaxAge);
    });

    return NextResponse.redirect(new URL(`${process.env.CLIENT_BASE}/auth/success?user=${res.data?.user.name}`));
};