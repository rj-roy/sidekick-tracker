import { OPEN_SIGN_IN_MESSAGE } from "@/shared/constants/api";

export const AuthApi = {
    async login(): Promise<void> {
        await browser.runtime.sendMessage({ type: OPEN_SIGN_IN_MESSAGE });
    },
}