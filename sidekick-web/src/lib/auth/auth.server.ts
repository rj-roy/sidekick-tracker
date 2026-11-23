import "server-only";
import { cache } from "react";
import type { SessionState } from "@/types/authTypes";
import { signedFetch } from "../server/signedFetch";
import { User } from "@/types/sessionTypes";

export const getSession = cache(async (): Promise<SessionState> => {
  try {
    const res = await signedFetch<{ user: User }>(
      "/auth/get/session",
      undefined,
      {
        method: "GET",
        redirectOnAuthError: false,
      },
    );

    return { data: res.success ? (res.data ?? null) : null, isPending: false };
  } catch {
    return { data: null, isPending: false };
  }
});