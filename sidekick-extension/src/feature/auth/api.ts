import { apiClient } from "@/shared/api/client";
import { OPEN_SIGN_IN_MESSAGE } from "@/shared/constants/api";
import type { User } from "@/shared/types";

export const AuthApi = {
    async login(): Promise<void> {
        await browser.runtime.sendMessage({ type: OPEN_SIGN_IN_MESSAGE });
    },

    async getSession(): Promise<User> {
        const data = await apiClient.get<{ user: User }>('/auth/get/session');
        console.log(data);
        return data?.user ?? {};
    },
}