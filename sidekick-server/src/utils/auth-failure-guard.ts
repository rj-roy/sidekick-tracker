import { logSecurityEvent } from "./security-log.js";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 10;
const LOCKOUT_MS = 30 * 60 * 1000;

interface FailureState {
  failures: number[];
  lockedUntil: number;
}

const ipState = new Map<string, FailureState>();

const pruneFailures = (state: FailureState, now: number): number[] =>
  state.failures.filter((timestamp) => now - timestamp < WINDOW_MS);

const cleanupInterval = setInterval(() => {
  const now = Date.now();

  for (const [ip, state] of ipState) {
    state.failures = pruneFailures(state, now);
    if (state.failures.length === 0 && state.lockedUntil <= now) {
      ipState.delete(ip);
    }
  }
}, 60 * 1000);

cleanupInterval.unref?.();

const RATE_LIMITED_CODES = new Set([
  "OAUTH_ERROR",
  "OAUTH_STATE_MISMATCH",
  "INVALID_ID_TOKEN",
]);

export const AuthFailureGuard = {
  recordFailure(ip: string, code?: string): void {
    if (code && !RATE_LIMITED_CODES.has(code)) return;

    const now = Date.now();
    let state = ipState.get(ip);

    if (!state) {
      state = { failures: [], lockedUntil: 0 };
      ipState.set(ip, state);
    }

    state.failures = pruneFailures(state, now);
    state.failures.push(now);

    if (state.failures.length >= MAX_FAILURES) {
      state.lockedUntil = now + LOCKOUT_MS;
      state.failures = [];
      logSecurityEvent("AUTH_FAILURE_LOCKOUT", { ip });
    }
  },

  isLockedOut(ip: string): boolean {
    const state = ipState.get(ip);
    if (!state) return false;

    if (state.lockedUntil > Date.now()) return true;

    if (state.lockedUntil > 0) {
      ipState.delete(ip);
    }

    return false;
  },
};