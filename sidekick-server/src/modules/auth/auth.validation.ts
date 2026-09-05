import { ApiError } from "../../utils/ApiError.js";

export const validateLoginCallback = (query: Record<string, unknown>) => {
    const { code, state } = query;

    if (typeof code !== "string" || !code.trim()) {
        throw new ApiError(400, "Authorization code is required");
    }

    if (typeof state !== "string" || !state.trim()) {
        throw new ApiError(400, "State parameter is required");
    }

    return { code: code.trim(), state: state.trim() };
};
