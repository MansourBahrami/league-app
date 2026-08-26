import { prisma } from "@/lib/db";
import UserReportsList from "@/components/admin/UserReportsList";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const reports = await prisma.userReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      reason: true,
      details: true,
      status: true,
      createdAt: true,
      reporter: { select: { name: true } },
      target: { select: { name: true } },
    },
  });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-extrabold text-on-surface">گزارش‌های کاربران</h1>
        <p className="mt-1 text-[13px] text-on-surface-variant">صف بررسی موارد ایمنی و رفتار نامناسب</p>
      </div>
      <UserReportsList initialReports={reports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString() }))} />
    </div>
  );
}
