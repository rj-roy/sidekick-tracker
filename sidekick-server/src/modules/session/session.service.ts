import { createHash, randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import type { WithId } from "mongodb";
import { env } from "../../config/env.js";
import { SessionDoc } from "./session.types.js";
import { SessionRepository } from "./session.repository.js";
import { ApiError } from "../../utils/ApiError.js";

export const SessionService = {
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
                if(!session){
                    throw new ApiError(501, "Internal Server Error!");
                };

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

    async validateSession(
        token: string,
        rotate?: { userAgent: string; ipAddress: string }
    ): Promise<{ session: WithId<SessionDoc>; rotatedToken?: string }> {
        const sessionIdHash = hash(token);
        const session = await SessionRepository.findBySessionIdHash(sessionIdHash);

        if (!session) {
            throw new ApiError(401, "Session not found", "SESSION_INVALID");
        }

        if (session.revokedAt) {
            throw new ApiError(401, "Session revoked", "SESSION_REVOKED");
        }

        if (session.rotatedToHash) {
            const graceMs = env.session.rotationGraceSeconds * 1000;
            const rotatedAt = session.rotatedAt?.getTime() ?? 0;

            if (Date.now() - rotatedAt > graceMs) {
                throw new ApiError(401, "Session rotated", "SESSION_ROTATED");
            }

            return { session };
        }

        if (session.expiresAt.getTime() <= Date.now()) {
            throw new ApiError(401, "Session expired", "SESSION_EXPIRED");
        }

        const now = new Date();
        const rotationIntervalMs = env.session.rotationIntervalSeconds * 1000;
        const shouldRotate =
            rotationIntervalMs > 0 &&
            rotate &&
            now.getTime() - session.createdAt.getTime() >= rotationIntervalMs;

        if (!shouldRotate) {
            await SessionRepository.touchSession(sessionIdHash, now);
            return { session };
        }

        const rotatedToken = await rotateSessionToken(session, now, rotate.userAgent, rotate.ipAddress);
        return { session, rotatedToken };
    },

    async revokeSession(token: string, revokeReason: string): Promise<void> {
        await SessionRepository.revokeSession(hash(token), revokeReason);
    },
};

const generateToken = (): string => randomBytes(32).toString('base64url');

const hash = (value: string): string => createHash("sha256").update(value).digest("hex");

const rotateSessionToken = async (
    session: WithId<SessionDoc>,
    rotatedAt: Date,
    userAgent: string,
    ipAddress: string
): Promise<string> => {
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
            await SessionRepository.upsertSession(doc);
            await SessionRepository.markRotated(session.sessionIdHash, newHash);
            return token;
        } catch (err) {
            if (err instanceof ApiError && err.code === "SESSION_COLLISION" && attempt === 0) {
                continue;
            }
            throw err;
        }
    }

    throw new ApiError(500, "Failed to create session", "SESSION_CREATE_FAILED");
};