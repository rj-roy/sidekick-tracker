// import { isValidPixelToken, PIXEL_HEADERS, stripGifExtension } from "@/lib/pixel";

// export const dynamic = "force-dynamic";

// // 1x1 fully transparent GIF, served when the token is unknown or the api is unreachable
// const FALLBACK_GIF = Buffer.from(
//     "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
//     "base64"
// );

// const pixelResponse = (body: Buffer) =>
//     new Response(new Uint8Array(body), { status: 200, headers: PIXEL_HEADERS });

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
    // const { id } = await ctx.params;
    // const token = stripGifExtension(id ?? "");

    // if (!isValidPixelToken(token)) {
    //     return pixelResponse(FALLBACK_GIF);
    // };

    // try {
    //     const res = await fetch(`${process.env.API_BASE}/pixel/open/${token}`, {
    //         cache: "no-store",
    //         headers: {
    //             "x-client-ua": req.headers.get("user-agent") ?? "",
    //             ...(req.headers.get("x-forwarded-for")
    //                 ? { "x-client-ip": req.headers.get("x-forwarded-for")! }
    //                 : {}),
    //         },
    //     });

    //     if (!res.ok) {
    //         return pixelResponse(FALLBACK_GIF);
    //     };

    //     return pixelResponse(Buffer.from(await res.arrayBuffer()));

    // } catch (error) {
    //     console.error("[pixel] failed to forward open:", error);
    //     return pixelResponse(FALLBACK_GIF);
    // }
}
