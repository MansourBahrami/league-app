import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMissionRoomSnapshot } from "@/lib/mission-room";
import { hasRunningStudyTimer } from "@/lib/focus";
import { getReactionsForActivities } from "@/lib/reaction";
import { formatJalaliLong } from "@/lib/date";
import MissionRoomRoster from "@/components/mission-rooms/MissionRoomRoster";
import LiveFeed from "@/components/feed/LiveFeed";
import { getBlockedUserIds } from "@/lib/privacy";
import MissionRoomDetailsLoading from "./loading";


function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest.toLocaleString("fa-IR")} دقیقه`;
  if (rest === 0) return `${hours.toLocaleString("fa-IR")} ساعت`;
  return `${hours.toLocaleString("fa-IR")} ساعت و ${rest.toLocaleString("fa-IR")} دقیقه`;
}

async function MissionRoomContent({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const now = new Date();
  const room = await getMissionRoomSnapshot(id, session.userId, now);
  if (!room) notFound();

  const memberIds = room.members.map((member) => member.userId);
  const [rawActivities, hasRunningTimer, blockedUserIds] = await Promise.all([
    prisma.activityLog.findMany({
      where: {
        userId: { in: memberIds },
        OR: [{ userId: session.userId }, { user: { activityPublic: true } }],
        createdAt: { gte: new Date(room.startsAt), lt: new Date(room.endsAt) },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { user: { select: { name: true, avatarUrl: true } } },
    }),
    hasRunningStudyTimer(session.userId, now),
    getBlockedUserIds(session.userId),
  ]);
  const activities = rawActivities.filter((activity) => {
    if (blockedUserIds.includes(activity.userId)) return false;
    if (activity.type !== "session_complete") return true;
    const metadata = (activity.metadata ?? {}) as Record<string, unknown>;
    return Number(metadata.durationMin ?? 0) > 0;
  });
  const { counts, mine } = await getReactionsForActivities(activities.map((activity) => activity.id), session.userId);
  const pending = room.status === "pending";
  const ended = room.status === "ended";

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <header className="glass-card overflow-hidden rounded-[2rem] border border-primary/25">
        <div className="bg-gradient-to-l from-primary to-primary-container px-4 pb-5 pt-4 text-on-primary">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-on-primary/15" aria-label="بازگشت به مطالعه">
              <span className="material-symbols-outlined" style={{ transform: "scaleX(-1)" }}>arrow_forward</span>
            </Link>
            <span className="rounded-full bg-on-primary/15 px-2.5 py-1 text-[10.5px] font-bold">
              {pending ? "در انتظار شروع" : ended ? "پایان‌یافته" : "در حال اجرا"}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-on-primary/15">
              <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>groups_3</span>
            </span>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[11px] text-on-primary/75">{room.kind === "daily" ? "ماموریت امروز" : "ماموریت هفتگی"}</p>
              <h1 className="text-[21px] font-extrabold">کمپ {room.targetHours.toLocaleString("fa-IR")} ساعت مطالعه</h1>
              <p className="mt-1 text-[10.5px] text-on-primary/75">
                {formatJalaliLong(new Date(room.startsAt), true)} تا {formatJalaliLong(new Date(room.endsAt))}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-outline-variant/30 px-3 py-3 text-center">
          <div><p className="text-[16px] font-extrabold text-primary">{room.memberCount.toLocaleString("fa-IR")}</p><p className="text-[9.5px] text-on-surface-variant">عضو</p></div>
          <div><p className="text-[16px] font-extrabold text-secondary">{room.studyingCount.toLocaleString("fa-IR")}</p><p className="text-[9.5px] text-on-surface-variant">در حال مطالعه</p></div>
          <div><p className="text-[16px] font-extrabold text-tertiary">{room.completedCount.toLocaleString("fa-IR")}</p><p className="text-[9.5px] text-on-surface-variant">تکمیل کرده</p></div>
        </div>
      </header>

      <section className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="text-[12px] font-bold text-on-surface-variant">پیشرفت شما در کمپ</p>
            <p className="mt-1 text-[16px] font-extrabold text-on-surface">رتبه {room.myRank.toLocaleString("fa-IR")} از {room.memberCount.toLocaleString("fa-IR")}</p>
          </div>
          <span className="text-[24px] font-extrabold text-primary">{room.myProgress.toLocaleString("fa-IR")}٪</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full rounded-full bg-gradient-to-l from-tertiary-fixed-dim to-primary" style={{ width: `${room.myProgress}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10.5px] text-on-surface-variant">
          <span>{formatMinutes(room.myStudiedMin)} مطالعه</span>
          <span>هدف {room.targetHours.toLocaleString("fa-IR")} ساعت</span>
        </div>
        {!hasRunningTimer && (
          <Link href="/dashboard" className="gamified-btn mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[14px] font-extrabold text-on-primary">
            <span className="material-symbols-outlined text-[19px]" style={{ fontVariationSettings: "'FILL' 1" }}>center_focus_strong</span>
            {pending ? "مطالعه آزاد تا شروع کمپ" : "شروع جلسه مطالعه"}
          </Link>
        )}
      </section>

      <MissionRoomRoster initialRoom={room} />

      <section className="space-y-3" aria-labelledby="room-activity-title">
        <div className="flex items-center justify-between px-1">
          <h2 id="room-activity-title" className="flex items-center gap-1.5 text-[15px] font-extrabold text-on-surface">
            <span className="material-symbols-outlined text-[19px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            اتفاق‌های کمپ
          </h2>
          <span className="text-[10.5px] text-on-surface-variant">برای تشویق واکنش بده</span>
        </div>
        <LiveFeed
          initialActivities={activities}
          meId={session.userId}
          initialCounts={counts}
          initialMine={mine}
          allowedUserIds={memberIds}
          blockedUserIds={blockedUserIds}
          emptyLabel="هنوز اتفاقی در این کمپ ثبت نشده؛ اولین جلسه را تو شروع کن."
        />
      </section>
    </div>
  );
}

export default function MissionRoomPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<MissionRoomDetailsLoading />}>
      <MissionRoomContent params={params} />
    </Suspense>
  );
}
