import { ApiError } from "../../utils/ApiError.js";
import type { OAuthState } from "./auth.types.js";

const serialize = (state: OAuthState): string =>
    Buffer.from(JSON.stringify(state), "utf8").toString("base64url");

export const serializeState = (deviceId?: string): string =>
    serialize({ random: crypto.randomUUID(), deviceId });

export const parseState = (state: string): OAuthState => {
    try {
        const parsed: unknown = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));

        if (!parsed || typeof parsed !== "object") {
            throw new Error("Malformed state");
        }

        const { random, deviceId } = parsed as { random?: unknown; deviceId?: unknown };

        if (typeof random !== "string" || !random.trim()) {
            throw new Error("Malformed state");
        }

        if (deviceId !== undefined && (typeof deviceId !== "string" || !deviceId.trim())) {
            throw new Error("Malformed state");
        }

        return {
            random: random.trim(),
            deviceId: typeof deviceId === "string" ? deviceId.trim() : undefined,
        };
    } catch {
        throw new ApiError(400, "Invalid or expired OAuth state");
    }
};

export const validateLoginCallback = (query: Record<string, unknown>) => {
    const { code, state, error } = query;

    if (typeof error === "string" && error.trim()) {
        throw new ApiError(400, `OAuth error: ${error.trim()}`, "OAUTH_ERROR");
    }

    if (typeof code !== "string" || !code.trim()) {
        throw new ApiError(400, "Authorization code is required");
    }

    if (typeof state !== "string" || !state.trim()) {
        throw new ApiError(400, "State parameter is required");
    }

    return { code: code.trim(), state: parseState(state.trim()) };
};