import type { ObjectId } from "mongodb";
import { TrackingRepository } from "./tracking.repository.js";
import { hash } from "../../utils/security/crypto.js";
import { env } from "../../config/env.js";
import type { OpenContext } from "./tracking.types.js";

const MAX_SUBJECT_LENGTH = 200;
const MAX_RECIPIENTS = 100;

export const TrackingService = {
    async markTrackedEmailSent(
        token: string,
        userId: ObjectId,
        meta: { subject?: string; recipient?: string[]; sentAt?: Date; messageId?: string },
    ) {
        const uniqueToken = hash(token);
        return await TrackingRepository.markTrackedEmailSent(uniqueToken, userId, {
            sentAt: meta.sentAt ?? new Date(),
            subject: meta.subject?.trim().slice(0, MAX_SUBJECT_LENGTH),
            recipient: (meta.recipient ?? []).slice(0, MAX_RECIPIENTS),
            messageId: meta.messageId,
        });
    },

    async recordOpen(token: string, ctx: OpenContext) {
        const uniqueToken = hash(token);
        const email = await TrackingRepository.findTrackedEmailByToken(uniqueToken);
        if (!email) return null;

        const openedAt = new Date();
        const withinGrace =
            email.sentAt instanceof Date
                ? openedAt.getTime() - email.sentAt.getTime() < env.tracking.selfOpenGraceMs
                : false;

        const isSelf = withinGrace;

        await TrackingRepository.insertOpen({
            trackedEmailId: email._id,
            userId: email.userId,
            uniqueToken,
            ...(email.messageId ? { messageId: email.messageId } : {}),
            openedAt,
            userAgent: ctx.userAgent,
            ip: ctx.ip,
            isMobile: ctx.isMobile,
            os: ctx.os,
            browser: ctx.browser,
            isSelf,
        });

        const countOpen = !isSelf;
        await TrackingRepository.markOpened(email._id, openedAt, {
            countOpen,
            setFirst: countOpen && !email.firstOpenedAt,
        });

        return email;
    },
};
