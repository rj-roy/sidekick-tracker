"use client";

import React, { useEffect, useState } from "react";
import Loading from "@/components/shared/Loading";
import {
  Mail,
  CheckCircle2,
  Send,
  Calendar,
  Users,
  ArrowRight,
  ArrowUp,
  Activity,
  User,
} from "lucide-react";

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
  const config: Record<string, { dot: string; text: string; bg: string }> = {
    Opened: {
      dot: "bg-primary",
      text: "text-primary",
      bg: "bg-muted",
    },
    Clicked: {
      dot: "bg-secondary",
      text: "text-secondary",
      bg: "bg-muted",
    },
    Delivered: {
      dot: "bg-primary",
      text: "text-primary",
      bg: "bg-muted",
    },
  };
  const c = config[status] || config.Opened;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function Sparkline() {
  return (
    <svg
      width="180"
      height="44"
      viewBox="0 0 180 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 38 C10 36, 18 34, 26 32 C34 30, 42 33, 50 28 C58 23, 66 26, 74 22 C82 18, 90 24, 98 18 C106 12, 114 16, 122 12 C130 8, 138 14, 146 8 C154 4, 162 6, 170 3 L178 2"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="178" cy="2" r="3" fill="var(--primary)" />
    </svg>
  );
}

export default function TrackMailDashboard() {
  const [session, setSession] = useState<{ user?: { name?: string } } | null>(
    null,
  );
  const [sessionLoading, setSessionLoading] = useState(true);
  const [emails, setEmails] = useState<TrackedEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session/browser", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setSession(json?.success ? json.data : null);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setSessionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sessionLoading || !session) return;
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
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, sessionLoading]);

  if (sessionLoading) {
    return <Loading />;
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <a href="/auth/google/login" className="text-primary underline">
          Sign in to view dashboard
        </a>
      </div>
    );
  }

  const total = emails.length;
  const opened = emails.filter(
    (e) => e.opened === true || e.status === "opened",
  ).length;
  const rate = total ? Math.round((opened / total) * 100) : 0;

  const delivered = total - opened;
  const STATS = [
    {
      label: "Emails Tracked",
      value: String(total),
      badge: "TOTAL",
      badgeColor: "bg-muted text-caption",
      change: "18%",
      icon: Mail,
      iconBg: "bg-muted",
      iconColor: "text-primary",
    },
    {
      label: "Delivered",
      value: String(delivered),
      badge: `${total ? Math.round((delivered / total) * 100) : 0}% Rate`,
      badgeColor: "bg-muted text-secondary",
      change: "0%",
      icon: Send,
      iconBg: "bg-muted",
      iconColor: "text-secondary",
    },
    {
      label: "Opened",
      value: String(opened),
      badge: `${rate}% Rate`,
      badgeColor: "bg-muted text-primary",
      change: "23%",
      icon: CheckCircle2,
      iconBg: "bg-muted",
      iconColor: "text-primary",
    },
  ];

  const EMAIL_ACTIVITY = emails.slice(0, 5).map((e) => {
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
      status: isOpened ? "Opened" : "Delivered",
      opened: isOpened ? timeAgo(e.lastOpenedAt || e.sentAt) : "–",
      clicked: "–",
      date: fmtDate(e.sentAt || e.createdAt),
      icon: Mail,
    };
  });

  const counts: Record<string, { name: string; count: number; opens: number }> =
    {};
  emails.forEach((e) => {
    const recipients = Array.isArray(e.recipient) ? e.recipient : [];
    const key = recipients.length ? recipients[0] : "Unknown";
    if (!counts[key]) counts[key] = { name: key, count: 0, opens: 0 };
    counts[key].count += 1;
    if (e.opened === true || e.status === "opened") counts[key].opens += 1;
  });
  const TOP_CONTACTS = Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((c) => ({
      initials:
        c.name
          .split(/\s+/)
          .map((w) => w[0] || "")
          .join("")
          .slice(0, 2)
          .toUpperCase() || "?",
      name: c.name,
      email: c.name,
      count: c.opens,
    }));

  return (
    <div className="bg-background font-sans text-body">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-headline">Dashboard</h1>
            <p className="mt-1 text-sm text-caption">
              Overview of your email tracking activity
            </p>
          </div>
          <button className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-body hover:bg-muted transition-colors">
            <Calendar className="h-4 w-4 text-caption" />
            Lifetime
            <span className="text-caption">▾</span>
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((stat) => {
            return (
              <div
                key={stat.label}
                className="rounded-md border border-border bg-surface p-5 flex justify-between items-start"
              >
                <div>
                  <p className="text-sm text-caption">{stat.label}</p>
                  <p className="mt-1 text-3xl font-semibold text-headline">
                    {stat.value}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-primary">
                    <ArrowUp className="h-3 w-3" />
                    <span className="font-medium">{stat.change}</span>
                    <span className="text-caption">from last week</span>
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-end">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${stat.badgeColor}`}
                  >
                    {stat.badge}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-6 flex flex-col gap-4 rounded-md border border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-headline">
                Weekly Engagement Velocity
              </p>
              <p className="text-xs text-caption">
                Real-time open & click frequency across all tracked outbound
                messages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <Sparkline />
            <div className="text-right">
              <p className="text-lg font-semibold text-primary">+28.4%</p>
              <p className="text-xs text-caption">Avg. Velocity</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-right">
              <p className="text-lg font-semibold text-headline">1m 42s</p>
              <p className="text-xs text-caption">Fastest Open Time</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-surface p-4 sm:p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-headline">
                  Recent Email Activity
                </h2>
                <p className="text-xs text-caption mt-0.5">
                  Real-time status of latest outbound tracked emails
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-xs font-medium text-caption">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Live Stream
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "SUBJECT",
                      "RECIPIENT",
                      "STATUS",
                      "OPENED",
                      "CLICKED",
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
                  {EMAIL_ACTIVITY.map((row, index) => {
                    const RowIcon = row.icon;
                    return (
                      <tr
                        key={index}
                        className="border-b border-border last:border-0 hover:bg-muted transition-colors"
                      >
                        <td className="py-3.5">
                          <div className="flex items-center gap-2.5 mr-3">
                            <RowIcon className="h-4 w-4 text-caption shrink-0" />
                            <span className="font-medium text-headline break-words">
                              {row.subject}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 text-caption">
                          {row.recipient}
                        </td>
                        <td className="py-3.5">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-2 py-3.5 text-caption whitespace-nowrap">
                          {row.opened}
                        </td>
                        <td className="px-2 py-3.5 text-caption whitespace-nowrap">
                          {row.clicked}
                        </td>
                        <td className="px-2 py-3.5 text-caption whitespace-nowrap">
                          {row.date}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-caption">
                {loading
                  ? "Loading..."
                  : `Showing latest ${Math.min(5, emails.length)} of ${emails.length} sent messages`}
              </p>
              <button className="flex items-center gap-1 text-sm font-medium text-primary hover:text-secondary transition-colors">
                View all emails
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col rounded-md border border-border bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-headline">
                  Top Contacts
                </h2>
                <p className="text-xs text-caption mt-0.5">
                  Most engaged recipients this cycle
                </p>
              </div>
              <Users className="h-5 w-5 text-caption" />
            </div>

            <div className="space-y-4 pb-5">
              {TOP_CONTACTS.map((contact) => (
                <div key={contact.initials} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-caption">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-headline truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs text-caption truncate">
                      {contact.email}
                    </p>
                  </div>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-primary">
                    {contact.count}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-caption">
                Ranked by opens & clicks
              </p>
              <button className="flex items-center gap-1 text-sm font-medium text-primary hover:text-secondary transition-colors">
                View all contacts
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}