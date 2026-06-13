import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmt(d: Date): string {
  return new Date(d).toLocaleString("fa-IR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminTournamentsPage() {
  const now = new Date();
  const tournaments = await prisma.tournament.findMany({
    orderBy: { startAt: "desc" },
    include: { _count: { select: { participants: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold text-[#0b1c30]">تورنومنت‌ها</h1>
        <Link href="/admin/tournaments/new" className="bg-[#4648d4] text-white font-bold text-[14px] px-4 py-2 rounded-xl flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">add</span>
          تورنومنت جدید
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <p className="text-[#767586] text-center py-10">هنوز تورنومنتی ساخته نشده.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {tournaments.map((t) => {
            const ended = new Date(t.endAt) < now;
            const started = new Date(t.startAt) <= now;
            const status = ended ? "پایان‌یافته" : started ? "در حال برگزاری" : "آینده";
            return (
              <Link key={t.id} href={`/admin/tournaments/${t.id}`} className="bg-white rounded-xl p-4 border border-[#c7c4d7]/30 flex items-center justify-between hover:border-[#4648d4]/40 transition-colors">
                <div className="text-right">
                  <p className="font-bold text-[15px] text-[#0b1c30]">{t.name}</p>
                  <p className="text-[12px] text-[#767586]">{fmt(t.startAt)} — {fmt(t.endAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[#464554]">{t._count.participants.toLocaleString("fa-IR")} نفر</span>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${ended ? "bg-[#f3f3f3] text-[#767586]" : started ? "bg-[#d4f5e6] text-[#006c49]" : "bg-[#e1e0ff] text-[#4648d4]"}`}>{status}</span>
                  {!t.isActive && <span className="text-[11px] text-[#ba1a1a]">غیرفعال</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
