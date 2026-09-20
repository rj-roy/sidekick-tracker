import { ApiError } from "../../utils/ApiError.js";
import { decrypt } from "../../utils/crypto.js";

const MAX_CODE_LENGTH = 4096;
const MAX_STATE_LENGTH = 256;

// reviewed
export const validateLoginCallback = (body: Record<string, unknown>) => {
    const { paramsCode, paramsState, _ms__i, o_bh_h } = body;
    const decryptedState = decrypt(paramsState as string, true);

    if (typeof paramsCode !== "string" || !paramsCode.trim()) {
        throw new ApiError(400, "Authorization code is required");
    }

    if (typeof decryptedState !== "string" || !decryptedState.trim()) {
        throw new ApiError(400, "State parameter is required");
    }

    const trimmedCode = paramsCode.trim();
    const trimmedState = decryptedState.trim();

    if (trimmedCode.length > MAX_CODE_LENGTH) {
        throw new ApiError(400, "Authorization code is too long", "OAUTH_ERROR");
    }

    if (trimmedState.length > MAX_STATE_LENGTH) {
        throw new ApiError(400, "State parameter is too long", "OAUTH_ERROR");
    }

    return { code: trimmedCode, state: trimmedState, cookieState: _ms__i, verifierCookieState: o_bh_h };
};