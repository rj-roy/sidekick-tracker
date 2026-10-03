export const pixelUrlFor = (token: string): string =>
    `${process.env.CLIENT_BASE}/api/track/${token}.gif`;

// export const PIXEL_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

// export const isValidPixelToken = (value: string): boolean => PIXEL_TOKEN_PATTERN.test(value);

// export const stripGifExtension = (value: string): string =>
//     value.endsWith(".gif") ? value.slice(0, -4) : value;

// export const PIXEL_HEADERS = {
//     "Content-Type": "image/gif",
//     "Cache-Control": "no-store, no-cache, must-revalidate, private",
//     Pragma: "no-cache",
//     Expires: "0",
//     "X-Content-Type-Options": "nosniff",
// };
