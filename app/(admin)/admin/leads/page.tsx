import { connection } from "next/server";
import { prisma } from "@/lib/db";
import ExportLeadsButton from "@/components/admin/ExportLeadsButton";
import { HOT_LEAD_STUDY_MINUTES, isHotLead } from "@/lib/leads";
import {
  DEFAULT_HOT_LEAD_COMPLETED_VIDEOS,
  isHotVideoLead,
  normalizeCompletedVideoThreshold,
  summarizeVideoProgress,
} from "@/lib/video-leads";

interface SearchParams {
  categoryId?: string;
  minCompleted?: string;
  onlyWarm?: string;
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const query = await searchParams;
  const minCompleted = normalizeCompletedVideoThreshold(query.minCompleted);
  const onlyWarm = query.onlyWarm === "1";

  const categories = await prisma.videoCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true },
  });
  const categoryId = categories.some((category) => category.id === query.categoryId)
    ? query.categoryId!
    : "";

  const progressRows = await prisma.videoProgress.findMany({
    where: {
      watchedSeconds: { gt: 0 },
      user: { phone: { not: null } },
      ...(categoryId ? { video: { categoryId } } : {}),
    },
    select: {
      userId: true,
      watchedSeconds: true,
      totalSeconds: true,
      completed: true,
      updatedAt: true,
      video: { select: { title: true, sortOrder: true } },
    },
  });
  const progressByUser = new Map<string, typeof progressRows>();
  for (const row of progressRows) {
    const current = progressByUser.get(row.userId) ?? [];
    current.push(row);
    progressByUser.set(row.userId, current);
  }
  const summaryByUser = new Map(
    [...progressByUser].map(([userId, rows]) => [userId, summarizeVideoProgress(rows)]),
  );
  const warmUserIds = [...summaryByUser]
    .filter(([, summary]) => isHotVideoLead(summary, minCompleted))
    .map(([userId]) => userId);

  const users = await prisma.user.findMany({
    where: {
      ...(onlyWarm
        ? { id: { in: warmUserIds } }
        : { isLeadComplete: true }),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      grade: true,
      field: true,
      xp: true,
      level: true,
      onboardingDay: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const studyByUser = users.length > 0
    ? await prisma.studySession.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((user) => user.id) } },
        _sum: { durationMin: true },
      })
    : [];
  const studyMap = new Map(
    studyByUser.map((row) => [row.userId, row._sum.durationMin ?? 0]),
  );
  const selectedCategory = categories.find((category) => category.id === categoryId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 max-sm:flex-col">
        <div>
          <h1 className="text-[22px] font-extrabold text-on-surface">لیدها و پیشروی ویدیو</h1>
          <p className="mt-1 text-[13px] text-outline">
            {warmUserIds.length.toLocaleString("fa-IR")} لید گرم ویدیویی دارای شمارهٔ تماس
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportLeadsButton />
          <ExportLeadsButton
            videoHot
            minCompleted={minCompleted}
            categoryId={categoryId}
          />
        </div>
      </div>

      <form
        action="/admin/leads"
        method="get"
        className="grid gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 sm:grid-cols-[1fr_160px_auto_auto] sm:items-end"
      >
        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-on-surface-variant">
          دوره یا دسته‌بندی
          <select
            name="categoryId"
            defaultValue={categoryId}
            className="rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-[14px] text-on-surface outline-none focus:border-primary"
          >
            <option value="">همه ویدیوها</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.title}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-on-surface-variant">
          حداقل جلسهٔ کامل
          <input
            type="number"
            name="minCompleted"
            min={1}
            max={100}
            defaultValue={minCompleted || DEFAULT_HOT_LEAD_COMPLETED_VIDEOS}
            className="rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-[14px] text-on-surface outline-none focus:border-primary"
          />
        </label>
        <label className="flex h-[42px] items-center gap-2 rounded-xl border border-outline-variant bg-surface px-3 text-[12px] font-semibold text-on-surface-variant">
          <input type="checkbox" name="onlyWarm" value="1" defaultChecked={onlyWarm} className="accent-primary" />
          فقط لیدهای گرم
        </label>
        <button type="submit" className="h-[42px] rounded-xl bg-primary px-5 text-[13px] font-bold text-on-primary">
          اعمال فیلتر
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
        <table className="w-full min-w-[850px] text-right text-[13px]">
          <thead>
            <tr className="border-b border-outline-variant/30 text-outline">
              <th className="p-3 font-semibold">نام و موبایل</th>
              <th className="p-3 font-semibold">پایه و رشته</th>
              <th className="p-3 font-semibold">جلسات ویدیو</th>
              <th className="p-3 font-semibold">زمان تماشا</th>
              <th className="p-3 font-semibold">آخرین پیشروی</th>
              <th className="p-3 font-semibold">جزئیات جلسات</th>
              <th className="p-3 font-semibold">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-outline">لیدی مطابق این فیلتر پیدا نشد.</td></tr>
            ) : users.map((user) => {
              const summary = summaryByUser.get(user.id) ?? summarizeVideoProgress([]);
              const videoWarm = isHotVideoLead(summary, minCompleted);
              const studyHot = isHotLead({
                onboardingDay: user.onboardingDay,
                totalStudyMinutes: studyMap.get(user.id) ?? 0,
              });
              return (
                <tr key={user.id} className="border-b border-outline-variant/15 align-top hover:bg-surface-container-low">
                  <td className="p-3">
                    <p className="font-semibold text-on-surface">{user.name ?? "—"}</p>
                    <p className="mt-0.5 text-[12px] text-on-surface-variant" dir="ltr">{user.phone}</p>
                  </td>
                  <td className="p-3 text-on-surface-variant">
                    <p>{user.grade ?? "—"}</p>
                    <p className="mt-0.5 text-[11px] text-outline">{user.field ?? "—"}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-primary">{summary.completedVideos.toLocaleString("fa-IR")} کامل</p>
                    <p className="mt-0.5 text-[11px] text-outline">از {summary.startedVideos.toLocaleString("fa-IR")} جلسهٔ شروع‌شده</p>
                  </td>
                  <td className="p-3 font-semibold text-on-surface-variant">{summary.watchedMinutes.toLocaleString("fa-IR")} دقیقه</td>
                  <td className="p-3 text-[12px] text-on-surface-variant">
                    {summary.lastProgressAt
                      ? summary.lastProgressAt.toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })
                      : "—"}
                  </td>
                  <td className="max-w-[290px] p-3 text-[11px] leading-5 text-on-surface-variant">
                    {summary.progressDetails.length > 0 ? summary.progressDetails.join(" · ") : "هنوز ویدیویی ندیده"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col items-start gap-1">
                      {videoWarm && <span className="rounded-full bg-tertiary-fixed/60 px-2 py-0.5 text-[11px] font-bold text-tertiary-container">گرم ویدیویی 🔥</span>}
                      {studyHot && <span className="rounded-full bg-secondary-container/60 px-2 py-0.5 text-[10px] font-semibold text-on-secondary-container">فعال در مطالعه</span>}
                      {!videoWarm && !studyHot && <span className="text-[11px] text-outline">عادی</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-center text-[12px] leading-6 text-outline">
        معیار فعلی لید گرم: شمارهٔ تماس ثبت‌شده + حداقل {minCompleted.toLocaleString("fa-IR")} جلسهٔ تکمیل‌شده
        {selectedCategory ? ` از «${selectedCategory.title}»` : " از ویدیوهای انتخاب‌شده"}.
        تکمیل هر جلسه یعنی مشاهدهٔ حداقل ۹۰٪ آن؛ خروجی کال‌سنتر، درصد تک‌تک جلسات را هم دارد.
        معیار قدیمی فعالیت مطالعه ({HOT_LEAD_STUDY_MINUTES.toLocaleString("fa-IR")} دقیقه) جداگانه نمایش داده می‌شود.
      </p>
    </div>
  );
}
