import { useState } from "react";
import Header from "../../components/Header";

type EmailStatus = "Opened" | "Delivered";

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
  Opened: { dot: "bg-[#16A34A] ring-4 ring-green-50", badge: "bg-[#DCFCE7] text-[#16A34A]" },
  Delivered: { dot: "bg-[#DC2626] ring-4 ring-red-50", badge: "bg-[#FEE2E2] text-[#DC2626]" },
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
      status: opened ? "Opened" : "Delivered",
    };
  });
};

export default function TrackedMailsView({ onBack, mailData }: { onBack: () => void; mailData: unknown }) {
  const emails = toRecentEmails(mailData);
  const openedCount = emails.filter((email) => email.status === "Opened").length;
  const deliveredCount = emails.length;

  const isLoading = !Array.isArray(mailData);

  return (
    <div className="w-[360px] bg-white rounded-sm  border border-[#E8E8EC] overflow-hidden flex flex-col text-[#111827]">
      <Header onHome={onBack} />

      <div className="p-4 space-y-3.5 bg-white">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center space-x-2">
            <button
              onClick={onBack}
              className="inline-flex items-center text-[#6B7280] hover:text-[#111827] transition-colors"
              title="Back"
              aria-label="Back"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"></path>
              </svg>
            </button>
            <span className="text-[13px] font-medium text-[#111827]">Tracking Status</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
            <span className="text-[11px] font-semibold text-[#16A34A] tracking-wide">ON</span>
          </div>
        </div>

        <div className="bg-white rounded border border-[#E8E8EC] p-3 ">
          <div className="flex items-center space-x-3 pb-3 border-b border-[#E8E8EC]">
            <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
              <div className="w-7 h-7 rounded-full bg-[#16A34A] flex items-center justify-center text-white ">                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[13px] font-bold text-[#16A34A]">
                    {emails[0]?.status ?? "No activity"}
                  </span>
                  <span className="text-xs text-[#6B7280]">·</span>
                  <span className="text-[12px] font-medium text-[#111827]">{emails[0]?.timeAgo ?? ""}</span>
                </div>
              </div>
              <p className="text-[11px] text-[#6B7280] mt-0.5">{emails[0]?.subject ?? "No tracked emails yet"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3">
            <div className="bg-[#F8F8F9] rounded-sm p-2 text-center border border-gray-100">
              <span className="block text-[11px] font-medium text-[#6B7280]">Opened</span>
              <span className="block text-[18px] font-bold text-[#16A34A] leading-tight my-0.5">{openedCount}</span>
              <span className="block text-[10px] text-[#6B7280]">Total</span>
            </div>
            <div className="bg-[#F8F8F9] rounded-sm p-2 text-center border border-gray-100">
              <span className="block text-[11px] font-medium text-[#6B7280]">Tracked</span>
              <span className="block text-[18px] font-bold text-[#DC2626] leading-tight my-0.5">{deliveredCount}</span>
              <span className="block text-[10px] text-[#6B7280]">Total</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2 px-0.5">
            <h2 className="text-[14px] font-semibold text-[#111827]">Recent Emails</h2>
            <span className="text-[11px] text-[#6B7280]">{emails.length} tracked</span>
          </div>

          {isLoading ? (
            <p className="text-[12px] text-[#6B7280] px-0.5">Loading tracked emails...</p>
          ) : emails.length === 0 ? (
            <p className="text-[12px] text-[#6B7280] px-0.5">No tracked emails yet.</p>
          ) : (
            <div className="space-y-1.5">
              {emails.map((email) => {
                const styles = STATUS_STYLES[email.status];
                return (
                  <div key={email.id} className="flex items-center justify-between p-2.5 rounded-sm border border-[#E8E8EC] bg-white hover:bg-[#F8F8F9] transition-colors">
                    <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${styles.dot}`}></span>
                      <div className="truncate">
                        <p className="text-[13px] font-semibold text-[#111827] truncate leading-tight">{email.subject}</p>
                        <p className="text-[11px] text-[#6B7280] truncate mt-0.5">{email.recipient}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 space-y-1">
                      <span className="text-[11px] text-[#6B7280]">{email.timeAgo}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${styles.badge}`}>
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
            className="w-full h-9 bg-[#1F5F5B] hover:bg-[#174946] active:bg-[#123936] text-white font-medium text-[13px] rounded-sm flex items-center justify-center space-x-2  transition-colors">
            <span>View Dashboard</span>
            <svg className="w-3.5 h-3.5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </button>

          <div className="flex justify-center pb-0.5">
            <a href="#" onClick={(event) => { event.preventDefault(); onBack(); }} className="inline-flex items-center space-x-1.5 text-[11px] text-[#6B7280] hover:text-[#111827] transition-colors">
              <svg className="w-3.5 h-3.5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>How it works</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
