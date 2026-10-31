import "server-only";

export function apiUrl(path: string): string {
    const configuredBase = process.env.API_BASE;
    if (!configuredBase) {
        throw new Error("API_BASE is required");
    }

    const base = new URL(configuredBase);
    const allowInsecureLocalProtocol = process.env.NODE_ENV !== "production";

    if (base.protocol !== "https:" && !(allowInsecureLocalProtocol && base.protocol === "http:")) {
        throw new Error("API_BASE must use HTTPS in production");
    }
    if (base.username || base.password || base.search || base.hash) {
        throw new Error("API_BASE must not contain credentials, query parameters, or a fragment");
    }

    const basePath = base.pathname.replace(/\/+$/, "");
    const requestPath = path.startsWith("/") ? path : `/${path}`;
    const target = new URL(`${basePath}${requestPath}`, base.origin);

    if (target.origin !== base.origin) {
        throw new Error("API request path must stay on the configured API_BASE origin");
    }

    return target.toString();
}
