"use client";

import { useState } from "react";
import { captureClientError } from "@/lib/analytics-client";

interface ReportRow {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { name: string | null };
  target: { name: string | null };
}

export default function UserReportsList({ initialReports }: { initialReports: ReportRow[] }) {
  const [reports, setReports] = useState(initialReports);
  const [busy, setBusy] = useState<string | null>(null);

  async function update(id: string, status: "reviewed" | "dismissed") {
    setBusy(id);
    const response = await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch((caught) => {
      captureClientError("admin.report_update", caught);
      return null;
    });
    setBusy(null);
    if (response?.ok) setReports((rows) => rows.map((row) => row.id === id ? { ...row, status } : row));
  }

  if (reports.length === 0) return <p className="rounded-xl bg-surface-container-lowest p-6 text-center text-on-surface-variant">گزارشی ثبت نشده است.</p>;
  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <article key={report.id} className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[15px] font-bold text-on-surface">{report.reason}</p>
              <p className="mt-1 text-[13px] text-on-surface-variant">گزارش‌دهنده: {report.reporter.name ?? "کاربر"} · کاربر گزارش‌شده: {report.target.name ?? "کاربر"}</p>
              {report.details && <p className="mt-2 rounded-lg bg-surface-container-low p-2 text-[13px] text-on-surface">{report.details}</p>}
            </div>
            <span className="rounded-full bg-surface-container px-3 py-1 text-[12px] font-bold">{report.status === "open" ? "باز" : report.status === "reviewed" ? "بررسی‌شده" : "ردشده"}</span>
          </div>
          {report.status === "open" && (
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy === report.id} onClick={() => update(report.id, "reviewed")} className="min-h-10 rounded-lg bg-primary px-3 text-[13px] font-bold text-on-primary disabled:opacity-50">بررسی شد</button>
              <button type="button" disabled={busy === report.id} onClick={() => update(report.id, "dismissed")} className="min-h-10 rounded-lg border border-outline-variant px-3 text-[13px] font-bold text-on-surface disabled:opacity-50">رد گزارش</button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
