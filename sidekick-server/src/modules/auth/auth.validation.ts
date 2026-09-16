import { ApiError } from "../../utils/ApiError.js";

const MAX_CODE_LENGTH = 4096;
const MAX_STATE_LENGTH = 256;

// reviewed
export const validateLoginCallback = (query: Record<string, unknown>) => {
    const { code, state, error } = query;

    if (typeof error === "string" && error.trim()) {
        throw new ApiError(400, "OAuth authentication failed", "OAUTH_ERROR");
    }

    if (typeof code !== "string" || !code.trim()) {
        throw new ApiError(400, "Authorization code is required");
    }

    if (typeof state !== "string" || !state.trim()) {
        throw new ApiError(400, "State parameter is required");
    }

    const trimmedCode = code.trim();
    const trimmedState = state.trim();

    if (trimmedCode.length > MAX_CODE_LENGTH) {
        throw new ApiError(400, "Authorization code is too long", "OAUTH_ERROR");
    }

    if (trimmedState.length > MAX_STATE_LENGTH) {
        throw new ApiError(400, "State parameter is too long", "OAUTH_ERROR");
    }

    return { code: trimmedCode, state: trimmedState };
};