import { AuthApi } from "@/feature/auth/api";
import type { SessionState } from "@/shared/types/AuthType";

export async function resolveSession(): Promise<SessionState> {
    try {
        const session = await AuthApi.getSession();

        if (!session) {
            return { status: "unauthenticated" };
        };

        return {
            status: "authenticated",
            user: session.user,
            session: session.session,
        };

    } catch (error) {
        console.error("Failed to resolve session:", error);
        return { status: "unauthenticated" };
    };
};