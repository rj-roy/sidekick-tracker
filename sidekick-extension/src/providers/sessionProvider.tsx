import type { SessionState } from "@/shared/types/AuthType";
import { createContext, useContext, type ReactNode, } from "react";

interface SessionProviderProps {
    initialSession: SessionState;
    children: ReactNode;
}

const SessionContext = createContext<{ session: SessionState } | null>(null);

export function SessionProvider({ initialSession, children, }: SessionProviderProps) {
    return (
        <SessionContext.Provider value={{ session: initialSession }}>
            {children}
        </SessionContext.Provider>
    );
};

export function useSession(): {session: SessionState} {
    const context = useContext(SessionContext);

    if (!context) {
        throw new Error(
            "useSession must be used within a SessionProvider",
        );
    };

    return context;
};
