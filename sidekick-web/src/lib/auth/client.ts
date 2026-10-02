"use client";
import { useSyncExternalStore } from "react";
import type { SessionState } from "@/types/authTypes";

const PENDING: SessionState = { data: null, isPending: true };

let state: SessionState = PENDING;
let started = false;
const listeners = new Set<() => void>();

function set(next: SessionState) {
  state = next;
  listeners.forEach((l) => l());
};

async function load() {
  try {
    const res = await fetch("/api/auth/get/session", {
      credentials: "include",
      cache: "no-store",
    });
    const json = res.ok ? await res.json() : null;
    set({ data: json?.success ? json.data : null, isPending: false });
  } catch {
    set({ data: null, isPending: false });
  };
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void load();
  };
  return () => {
    listeners.delete(listener);
  };
};

export const useSession = () =>
  useSyncExternalStore(subscribe, () => state, () => PENDING);

export async function refreshSession() {
  set({ ...state, isPending: true }); 
  await load();
};