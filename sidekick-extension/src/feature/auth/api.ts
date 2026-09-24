import { apiClient } from "@/shared/api/client";
import { OPEN_SIGN_IN_MESSAGE } from "@/shared/constants/api";
import type { Session, SessionRes, User } from "@/shared/types/AuthType";
import { apiClientError } from "@/shared/utils/apiClientError";

export const AuthApi = {
    async login(): Promise<void> {
        await browser.runtime.sendMessage({ type: OPEN_SIGN_IN_MESSAGE });
    },

    async getSession(): Promise<SessionRes | null> {
        try {
            return await apiClient.get<SessionRes | null>("/auth/get/session");
        } catch (error) {
            if (error instanceof apiClientError) {
                if (error.status === 401) {
                    return null;
                };
            };

            throw error;
        };
    },
}