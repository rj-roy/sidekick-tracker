import { User } from "./sessionTypes";

export interface AuthRes {
  url: string;
  states: {
    _ms__i: string;
    o_bh_h: string;
  };
}
export interface SessionState {
  isPending: boolean;
  data: { user: User } | null;
}