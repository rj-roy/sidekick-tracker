import type { ObjectId } from "mongodb";

export type TrackedEmailStatus = "pending" | "sent" | "opened";

export interface TrackedEmailDoc {
    userId: ObjectId;
    uniqueToken: string;
    status: TrackedEmailStatus;
    messageId?: string;
    subject?: string;
    recipientCount: number;
    openCount: number;
    firstOpenedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
};

// export interface EmailOpenDoc {
//     trackedEmailId: ObjectId;
//     uniqueToken: string;
//     openedAt: Date;
//     userAgent?: string;
//     ip?: string;
// };

export interface CreateTrackingMeta {
    subject?: string;
    recipientCount?: number;
}

export interface CreatedTracking {
    token: string;
    createdAt: Date;
}

// export interface OpenContext {
//     userAgent?: string;
//     ip?: string;
// }
