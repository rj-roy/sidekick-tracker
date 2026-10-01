"use client";
import { SessionState } from "@/types/authTypes";
import { useSyncExternalStore } from "react";

let state: SessionState = {
    data: null,
    isPending: true,
};

let initialized = false;
let promise: Promise<void> | null = null;

const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

function getSnapshot() {
    return state;
}

function getServerSnapshot() {
    return {
        data: null,
        isPending: true,
    };
}

async function fetchSession() {
    if (promise) {
        return promise;
    };

    promise = fetch("api/auth/get/session", {
        method: "GET",
        credentials: "include",

    }).then(async (res) => {
        if (!res.ok) {
            state = { data: null, isPending: false, };
            return;
        };

        const data = await res.json();
        state = { data: data.success ? data : null, isPending: false, };

    }).catch(() => {
        state = { data: null, isPending: false, };

    }).finally(() => {
        promise = null;
        emit();
    });

    return promise;
};

function initialize() {
    if (initialized) return;

    initialized = true;
    void fetchSession();
};

export const client = {
    useSession() {
        initialize();

        const snapshot = useSyncExternalStore(
            subscribe,
            getSnapshot,
            getServerSnapshot,
        );

        return snapshot;
    },

    async refreshSession() {
        state = { ...state, isPending: true, };
        emit();
        await fetchSession();
    },
};