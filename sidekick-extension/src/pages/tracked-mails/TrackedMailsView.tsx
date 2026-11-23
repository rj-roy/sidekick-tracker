import { useState } from "react";
import { ArrowLeft, Check, ExternalLink, HelpCircle } from "lucide-react";
import Header from "../../components/Header";

type EmailStatus = "Opened" | "Sent";

interface RecentEmail {
  id: string;
  subject: string;
  recipient: string;
  timeAgo: string;
  status: EmailStatus;
}

interface TrackedMail {
  _id?: unknown;
  subject?: string;
  recipient?: string[];
  recipientCount?: number;
  status?: string;
  opened?: boolean;
  sentAt?: string | Date;
  createdAt?: string | Date;
}

const STATUS_STYLES: Record<EmailStatus, { dot: string; badge: string }> = {
  Opened: { dot: "bg-primary", badge: "bg-muted text-primary" },
  Sent: { dot: "bg-secondary", badge: "bg-muted text-secondary" },
};

const formatTimeAgo = (value: string | Date | undefined): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const toRecentEmails = (mailData: unknown): RecentEmail[] => {
  if (!Array.isArray(mailData)) return [];
  return (mailData as TrackedMail[]).map((mail, index) => {
    const recipients = Array.isArray(mail.recipient) ? mail.recipient : [];
    const recipient =
      recipients.length > 0
        ? recipients.join(", ")
        : `${mail.recipientCount ?? 0} recipients`;
    const opened = mail.opened === true || mail.status === "opened";
    return {
      id: String(mail._id ?? index),
      subject: mail.subject?.trim() || "(no subject)",
      recipient,
      timeAgo: formatTimeAgo(mail.sentAt ?? mail.createdAt),
      status: opened ? "Opened" : "Sent",
    };
  });
};

export default function TrackedMailsView({ onBack, mailData }: { onBack: () => void; mailData: unknown }) {
  const emails = toRecentEmails(mailData);
  const openedCount = emails.filter((email) => email.status === "Opened").length;
  const deliveredCount = emails.length;

  const isLoading = !Array.isArray(mailData);

  return (
    <div className="w-[360px] bg-background rounded-md border border-border overflow-hidden flex flex-col text-foreground">
      <Header onHome={onBack} />

      <div className="p-4 space-y-3.5 bg-background">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center space-x-2">
            <button
              onClick={onBack}
              className="inline-flex items-center text-caption hover:text-foreground transition-colors"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-medium text-foreground">Tracking Status</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-muted px-2.5 py-0.5 rounded-md border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[11px] font-semibold text-primary tracking-wide">ON</span>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-center space-x-3 pb-3 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Check className="w-4 h-4" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[13px] font-bold text-primary">
                    {emails[0]?.status ?? "No activity"}
                  </span>
                  <span className="text-xs text-caption">·</span>
                  <span className="text-[12px] font-medium text-foreground">{emails[0]?.timeAgo ?? ""}</span>
                </div>
              </div>
              <p className="text-[11px] text-caption mt-0.5">{emails[0]?.subject ?? "No tracked emails yet"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3">
            <div className="bg-muted rounded-md p-2 text-center border border-border">
              <span className="block text-[11px] font-medium text-caption">Opened</span>
              <span className="block text-[18px] font-bold text-primary leading-tight my-0.5">{openedCount}</span>
              <span className="block text-[10px] text-caption">Total</span>
            </div>
            <div className="bg-muted rounded-md p-2 text-center border border-border">
              <span className="block text-[11px] font-medium text-caption">Tracked</span>
              <span className="block text-[18px] font-bold text-secondary leading-tight my-0.5">{deliveredCount}</span>
              <span className="block text-[10px] text-caption">Total</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2 px-0.5">
            <h2 className="text-[14px] font-semibold text-foreground">Recent Emails</h2>
            <span className="text-[11px] text-caption">{emails.length} tracked</span>
          </div>

          {isLoading ? (
            <p className="text-[12px] text-caption px-0.5">Loading tracked emails...</p>
          ) : emails.length === 0 ? (
            <p className="text-[12px] text-caption px-0.5">No tracked emails yet.</p>
          ) : (
            <div className="space-y-1.5">
              {emails.map((email) => {
                const styles = STATUS_STYLES[email.status];
                return (
                  <div key={email.id} className="flex items-center justify-between p-2.5 rounded-md border border-border bg-surface hover:bg-muted transition-colors">
                    <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${styles.dot}`}></span>
                      <div className="truncate">
                        <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{email.subject}</p>
                        <p className="text-[11px] text-caption truncate mt-0.5">{email.recipient}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 space-y-1">
                      <span className="text-[11px] text-caption">{email.timeAgo}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${styles.badge}`}>
                        {email.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-1 space-y-2.5">
          <button
            onClick={() => browser.tabs.create({ url: "https://sidekick-tracker-web.vercel.app/dashboard" })}
            className="w-full h-9 bg-secondary hover:bg-secondary text-secondary-foreground font-medium text-[13px] rounded-md flex items-center justify-center space-x-2 transition-colors">
            <span>View Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5 text-secondary-foreground" />
          </button>

          <div className="flex justify-center pb-0.5">
            <a href="#" onClick={(event) => { event.preventDefault(); onBack(); }} className="inline-flex items-center space-x-1.5 text-[11px] text-caption hover:text-foreground transition-colors">
              <HelpCircle className="w-3.5 h-3.5 text-caption" />
              <span>How it works</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}