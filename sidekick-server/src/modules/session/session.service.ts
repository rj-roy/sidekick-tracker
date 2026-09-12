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

                return { token };

            } catch (err) {
                if (err instanceof ApiError && err.code === "SESSION_COLLISION" && attempt === 0) {
                    continue;
                };
                
                throw err;
            };
        };
        throw new ApiError(500, "Failed to create session", "SESSION_CREATE_FAILED");
    },

    async validateSession(token: string): Promise<{ session: WithId<SessionDoc> }> {
        const sessionIdHash = hash(token);
        const session = await SessionRepository.findBySessionIdHash(sessionIdHash);

        if (!session) {
            throw new ApiError(401, "Session not found", "SESSION_INVALID");
        }

        if (session.revokedAt) {
            throw new ApiError(401, "Session revoked", "SESSION_REVOKED");
        }

        if (session.expiresAt.getTime() <= Date.now()) {
            throw new ApiError(401, "Session expired", "SESSION_EXPIRED");
        }

        await SessionRepository.touchSession(sessionIdHash, new Date());
        return { session };
    },

    async revokeSession(token: string, revokeReason: string): Promise<void> {
        await SessionRepository.revokeSession(hash(token), revokeReason);
    },
};

const generateToken = (): string => randomBytes(32).toString('base64url');

const hash = (value: string): string => createHash("sha256").update(value).digest("hex");