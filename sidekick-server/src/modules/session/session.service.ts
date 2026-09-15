import { createHash, randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import type { WithId } from "mongodb";
import { env } from "../../config/env.js";
import { SessionDoc } from "./session.types.js";
import { SessionRepository } from "./session.repository.js";
import { ApiError } from "../../utils/ApiError.js";
import { logSecurityEvent } from "../../utils/security-log.js";
import { uaFamily } from "../../utils/ua.js";

const TOKEN_REGEX = /^[A-Za-z0-9_-]{43,}$/;

interface ValidatedSession {
    session: WithId<SessionDoc>;
    rotatedToken?: string;
    rotatedSessionId?: string;
}

export const SessionService = {

    //reviewed
    async createSession(userId: ObjectId, userAgent: string, ipAddress: string) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + env.session.expiresInSeconds * 1000);

        for (let attempt = 0; attempt < 2; attempt++) {
            const token = generateToken();
            const doc: SessionDoc = {
                userId,
                sessionIdHash: hash(token),
                createdAt: now,
                expiresAt: expiresAt,
                lastSeenAt: now,
                userAgent: userAgent,
                ipAddress: ipAddress,
            };

            try {
                const session = await SessionRepository.upsertSession(doc)
                if (!session) {
                    throw new ApiError(501, "Internal Server Error!");
                };

                logSecurityEvent("SESSION_CREATED", {
                    userId: userId.toHexString(),
                    sessionId: session._id.toHexString(),
                });

                return { token, sessionId: session._id.toHexString() };

            } catch (err) {
                if (err instanceof ApiError && err.code === "SESSION_COLLISION" && attempt === 0) {
                    continue;
                };

                throw err;
            };
        };
        throw new ApiError(500, "Failed to create session", "SESSION_CREATE_FAILED");
    },

    //reviewed
    async validateSession(
        token: string,
        rotate?: { userAgent: string; ipAddress: string }
    ): Promise<ValidatedSession> {
        if (!isWellFormedToken(token)) {
            throw new ApiError(401, "Invalid session token", "SESSION_INVALID");
        }

        const session = await SessionRepository.findBySessionIdHash(hash(token));
        const userIdHex = session?.userId.toHexString();

        if (!session) {
            logSecurityEvent("SESSION_INVALID", { reason: "not-found" });
            throw new ApiError(401, "Authentication required", "SESSION_INVALID");
        }

        if (session.revokedAt) {
            logSecurityEvent("SESSION_REVOKED", {
                userId: userIdHex,
                sessionId: session._id.toHexString(),
                reason: session.revokeReason ?? "unknown",
            });
            throw new ApiError(401, "Authentication required", "SESSION_REVOKED");
        }

        if (session.expiresAt.getTime() <= Date.now()) {
            logSecurityEvent("SESSION_EXPIRED", {
                userId: userIdHex,
                sessionId: session._id.toHexString(),
            });
            throw new ApiError(401, "Authentication required", "SESSION_EXPIRED");
        }

        //todo: rotatedToHash, rotatedAt didn't pushed on db
        if (session.rotatedToHash) {
            const graceMs = env.session.rotationGraceSeconds * 1000;
            const rotatedAt = session.rotatedAt?.getTime() ?? 0;

            if (Date.now() - rotatedAt > graceMs) {
                throw new ApiError(401, "Authentication required", "SESSION_ROTATED");
            }

            return { session };
        }

        if (rotate) {
            await detectAnomaly(session, rotate);
        }

        const now = new Date();
        const rotationIntervalMs = env.session.rotationIntervalSeconds * 1000;
        const shouldRotate =
            rotationIntervalMs > 0
            && rotate
            && now.getTime() - session.createdAt.getTime() >= rotationIntervalMs;

        if (!shouldRotate) {
            await SessionRepository.touchSession(session.sessionIdHash, now);
            return { session };
        }

        const rotated = await rotateSessionToken(session, now, rotate.userAgent, rotate.ipAddress);

        if (!rotated) {
            return { session };
        }

        return { session, rotatedToken: rotated.token, rotatedSessionId: rotated.sessionId };
    },

    async revokeSession(token: string, revokeReason: string): Promise<void> {
        await SessionRepository.revokeSession(hash(token), revokeReason);
    },

    async revokeAllForUser(userId: ObjectId, revokeReason: string): Promise<number> {
        const count = await SessionRepository.revokeAllForUser(userId, revokeReason);

        if (count > 0) {
            logSecurityEvent("SESSION_REVOKED_ALL", { userId: userId.toHexString(), count });
        }

        return count;
    },

    async listSessions(userId: ObjectId): Promise<WithId<SessionDoc>[]> {
        return SessionRepository.findByUserId(userId);
    },

    async revokeSessionById(
        userId: ObjectId,
        sessionId: ObjectId,
        revokeReason: string
    ): Promise<boolean> {
        const revoked = await SessionRepository.revokeById(userId, sessionId, revokeReason);

        if (revoked) {
            logSecurityEvent("SESSION_REVOKED", {
                userId: userId.toHexString(),
                sessionId: sessionId.toHexString(),
                reason: revokeReason,
            });
        }

        return revoked;
    },
};

//reviewed
const generateToken = (): string => randomBytes(32).toString('base64url');

//reviewed
const hash = (value: string): string => createHash("sha256").update(value).digest("hex");

//reviewed todo: session collection don't includes rotation key
const rotateSessionToken = async (
    session: WithId<SessionDoc>,
    rotatedAt: Date,
    userAgent: string,
    ipAddress: string
): Promise<{ token: string; sessionId: string } | null> => {
    const expiresAt = new Date(rotatedAt.getTime() + env.session.expiresInSeconds * 1000);

    for (let attempt = 0; attempt < 2; attempt++) {
        const token = generateToken();
        const newHash = hash(token);
        const doc: SessionDoc = {
            userId: session.userId,
            sessionIdHash: newHash,
            createdAt: rotatedAt,
            expiresAt,
            lastSeenAt: rotatedAt,
            userAgent,
            ipAddress,
        };

        try {
            const newSession = await SessionRepository.upsertSession(doc);

            const claimed = await SessionRepository.claimRotation(
                session.sessionIdHash,
                rotatedAt,
                newHash
            );

            if (!claimed) {
                await SessionRepository.deleteBySessionIdHash(newHash).catch(() => undefined);
                return null;
            }

            logSecurityEvent("SESSION_ROTATED", {
                userId: session.userId.toHexString(),
                fromSessionId: session._id.toHexString(),
                sessionId: newSession._id.toHexString(),
                graceSeconds: env.session.rotationGraceSeconds,
            });

            return { token, sessionId: newSession._id.toHexString() };
        } catch (err) {
            if (err instanceof ApiError && err.code === "SESSION_COLLISION" && attempt === 0) {
                continue;
            }
            throw err;
        }
    }

    throw new ApiError(500, "Failed to create session", "SESSION_CREATE_FAILED");
};

//reviewed
function isWellFormedToken(token: string): boolean {
    return TOKEN_REGEX.test(token) && token.length <= 256;
};

//reviewed
const detectAnomaly = async (
    session: WithId<SessionDoc>,
    rotate: { userAgent: string; ipAddress: string }
) => {
    const ipChanged =
        session.ipAddress !== undefined
        && session.ipAddress !== null
        && session.ipAddress !== rotate.ipAddress;

    const uaChanged =
        session.userAgent !== undefined
        && session.userAgent !== null
        && session.userAgent !== rotate.userAgent;

    //todo: update the ip on db
    if (ipChanged) {
        logSecurityEvent("SESSION_IP_CHANGED", {
            userId: session.userId.toHexString(),
            sessionId: session._id.toHexString(),
        });
    }

    //todo: revoke(optional) and logout the user
    if (uaChanged) {
        logSecurityEvent("SESSION_UA_CHANGED", {
            userId: session.userId.toHexString(),
            sessionId: session._id.toHexString(),
        });
    }

    const familyChanged =
        session.userAgent !== undefined
        && rotate.userAgent !== undefined
        && uaFamily(session.userAgent) !== uaFamily(rotate.userAgent);

    if (ipChanged && familyChanged) {
        logSecurityEvent("SESSION_HIGH_RISK_ANOMALY", {
            userId: session.userId.toHexString(),
            sessionId: session._id.toHexString(),
        });

        if (env.session.revokeOnHighRiskAnomaly) {
            await SessionRepository.revokeSession(session.sessionIdHash, "high-risk-anomaly");
            throw new ApiError(401, "Authentication required", "SESSION_REVOKED");
        }
    }
}