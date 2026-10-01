import { Session, User } from "./sessionTypes";

export interface AuthRes {
    url: string;
    states: {
        _ms__i: string;
        o_bh_h: string;
    };
}

export interface SessionState {
    isPending: boolean;
    data: {
        success: boolean;
        message: string;
        data: {
            user: User;
            session: Session;
        };
    } | null;
}