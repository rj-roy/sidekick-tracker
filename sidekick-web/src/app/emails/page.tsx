"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import Loading from "@/components/shared/Loading";
import { useSession } from "@/lib/auth/auth.client";

type TrackedEmail = {
  _id?: string;
  subject?: string;
  recipient?: string[];
  recipientCount?: number;
  status?: string;
  opened?: boolean;
  lastOpenedAt?: string | Date;
  sentAt?: string | Date;
  createdAt?: string | Date;
};

function fmtDate(value: string | Date | undefined) {
  if (!value) return "–";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "–";
  return (
    d.toLocaleDateString() +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

function timeAgo(value: string | Date | undefined) {
  if (!value) return "–";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "–";
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const isOpened = status === "Opened";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${isOpened ? "bg-muted text-primary" : "bg-muted text-secondary"
        }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isOpened ? "bg-primary" : "bg-secondary"
          }`}
      />
      {status}
    </span>
  );
}

export default function AllEmailsPage() {
  const session = useSession();
  const [emails, setEmails] = useState<TrackedEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session.isPending || !session.data) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch("/api/tracking/get", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setEmails(json.data);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (session.isPending) return <Loading />;

  if (!session.data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Link href="/auth/google/login" className="text-primary underline">
          Sign in to view emails
        </Link>
      </div>
    );
  }

  const rows = emails.map((e) => {
    const recipients = Array.isArray(e.recipient) ? e.recipient : [];
    const recipient = recipients.length
      ? recipients.join(", ")
      : e.recipientCount
        ? `${e.recipientCount} recipients`
        : "–";
    const isOpened = e.opened === true || e.status === "opened";
    return {
      subject: e.subject || "(no subject)",
      recipient,
      status: isOpened ? "Opened" : "Sent",
      opened: isOpened ? timeAgo(e.lastOpenedAt || e.sentAt) : "–",
      date: fmtDate(e.sentAt || e.createdAt),
    };
  });

  return (
    <div className="bg-background font-sans text-body">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 justify-between w-full">
            <div>
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm font-medium text-caption hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </div>
            <div>
              <p className="mt-1 text-sm text-caption underline underline-offset-4">
                {loading
                  ? "Loading..."
                  : `${emails.length} tracked email${emails.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {[
                    "SUBJECT",
                    "RECIPIENT",
                    "STATUS",
                    "OPENED",
                    "DATE",
                  ].map((h) => (
                    <th
                      key={h}
                      className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-caption"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-caption">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-caption">
                      No tracked emails yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-border last:border-0 hover:bg-muted transition-colors"
                    >
                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5 mr-3">
                          <Mail className="h-4 w-4 text-caption shrink-0" />
                          <span className="font-medium text-headline break-words">
                            {row.subject}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 text-caption">{row.recipient}</td>
                      <td className="py-3.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-2 py-3.5 text-caption whitespace-nowrap">
                        {row.opened}
                      </td>
                      <td className="px-2 py-3.5 text-caption whitespace-nowrap">
                        {row.date}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
