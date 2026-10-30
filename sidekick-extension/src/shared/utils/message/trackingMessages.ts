import type { EmailSentMessage } from "@/feature/email-tracking/TrackingTypes";
import { EMAIL_SENT } from "@/shared/constants/api";

export const notifyEmailSent = (payload: Omit<EmailSentMessage, "type">): void => {
    void browser.runtime.sendMessage({ type: EMAIL_SENT, ...payload });
};