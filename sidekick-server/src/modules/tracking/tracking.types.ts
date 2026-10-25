import type { ObjectId } from "mongodb";

export type TrackedEmailStatus = "pending" | "sent" | "opened";

export interface TrackedEmailDoc {
    userId: ObjectId;
    uniqueToken: string;
    status: TrackedEmailStatus;
    messageId?: string;
    subject?: string;
    recipient: string[];
    recipientCount: number;
    opened: boolean;
    openCount: number;
    sentAt?: Date;
    firstOpenedAt?: Date;
    lastOpenedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface EmailOpenDoc {
    trackedEmailId: ObjectId;
    userId: ObjectId;
    uniqueToken: string;
    messageId?: string;
    openedAt: Date;
    userAgent: string;
    ip: string;
    isMobile: boolean;
    os: string;
    browser: string;
    isSelf: boolean;
}

export interface OpenContext {
    userAgent: string;
    ip: string;
    isMobile: boolean;
    os: string;
    browser: string;
};
