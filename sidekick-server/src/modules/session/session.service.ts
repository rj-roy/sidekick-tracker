import { createHash, randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { SessionDoc } from "./session.types.js";
import { SessionRepository } from "./session.repository.js";
import { ApiError } from "../../utils/ApiError.js";

export const SessionService = {
    async createSession(userId: ObjectId, userAgent: string, ipAddress: string) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + env.session.expiresInSeconds * 1000);

        for (let attempt = 0; attempt < 2; attempt++) {
            const secrets = generateSecrets();
            const doc: SessionDoc = {
                userId,
                sessionIdHash: hash(secrets.token),
                rotationKeyHash: hash(secrets.rotationKey),
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

                return { token: secrets.token };

            } catch (err) {
                if (err instanceof ApiError && err.code === "SESSION_COLLISION" && attempt === 0) {
                    continue;
                };
                
                throw err;
            };
        };
        throw new ApiError(500, "Failed to create session", "SESSION_CREATE_FAILED");
    },
};

const generateSecrets = (): { token: string, rotationKey: string } => ({
    token: randomBytes(32).toString('base64url'),
    rotationKey: randomBytes(32).toString('base64'),
});

const hash = (value: string): string => createHash("sha256").update(value).digest("hex");