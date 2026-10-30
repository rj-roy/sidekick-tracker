import { isValidPixelToken, PIXEL_HEADERS, stripGifExtension } from "@/lib/pixel";
import { externalApiFetch } from "@/lib/server/externalApiFetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FALLBACK_GIF = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
);

const pixelResponse = (body: Buffer) =>
    new Response(new Uint8Array(body), { status: 200, headers: PIXEL_HEADERS });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const token = stripGifExtension(id ?? "");
    
    if (!isValidPixelToken(token)) {
        return pixelResponse(FALLBACK_GIF);
    };


    try {
        const res = await externalApiFetch(`/pixel/open/${token}`, {
            method: "GET"
        });

        if (!res.ok) return pixelResponse(FALLBACK_GIF);
        return pixelResponse(Buffer.from(await res.arrayBuffer()));
    } catch (error) {
        console.error("[pixel] forward failed:", error);
        return pixelResponse(FALLBACK_GIF);
    }
};