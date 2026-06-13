import { prisma } from "@/lib/db";
import ExportLeadsButton from "@/components/admin/ExportLeadsButton";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const users = await prisma.user.findMany({
    where: { isLeadComplete: true },
    select: { id: true, name: true, phone: true, grade: true, field: true, xp: true, level: true, onboardingDay: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // لید داغ: پروفایل کامل + پیشروی در آنبوردینگ (روز ۳ به بعد) = نشانه تعهد
  const isHot = (onboardingDay: number) => onboardingDay >= 3;
  const hotCount = users.filter((u) => isHot(u.onboardingDay)).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0b1c30]">لیدها</h1>
          <p className="text-[13px] text-[#767586]">{users.length.toLocaleString("fa-IR")} لید · {hotCount.toLocaleString("fa-IR")} داغ 🔥</p>
        </div>
        <div className="flex gap-2">
          <ExportLeadsButton />
          <ExportLeadsButton hot />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#c7c4d7]/30 overflow-x-auto">
        <table className="w-full text-right text-[13px]">
          <thead>
            <tr className="border-b border-[#c7c4d7]/30 text-[#767586]">
              <th className="p-3 font-semibold">نام</th>
              <th className="p-3 font-semibold">موبایل</th>
              <th className="p-3 font-semibold">پایه</th>
              <th className="p-3 font-semibold">رشته</th>
              <th className="p-3 font-semibold">XP</th>
              <th className="p-3 font-semibold">سطح</th>
              <th className="p-3 font-semibold">روز</th>
              <th className="p-3 font-semibold">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-[#767586]">هنوز لیدی ثبت نشده.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-[#c7c4d7]/15 hover:bg-[#eff4ff]">
                  <td className="p-3 font-semibold text-[#0b1c30]">{u.name ?? "—"}</td>
                  <td className="p-3 text-[#464554]" dir="ltr">{u.phone}</td>
                  <td className="p-3 text-[#464554]">{u.grade ?? "—"}</td>
                  <td className="p-3 text-[#464554]">{u.field ?? "—"}</td>
                  <td className="p-3 text-[#4648d4] font-bold">{u.xp.toLocaleString("fa-IR")}</td>
                  <td className="p-3 text-[#464554]">{u.level}</td>
                  <td className="p-3 text-[#464554]">{u.onboardingDay.toLocaleString("fa-IR")}</td>
                  <td className="p-3">
                    {isHot(u.onboardingDay) ? (
                      <span className="bg-[#ffddb8]/50 text-[#a36700] px-2 py-0.5 rounded-full text-[11px] font-bold">داغ 🔥</span>
                    ) : (
                      <span className="text-[#767586] text-[11px]">عادی</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-[#767586] text-center">
        لید داغ = پروفایل کامل + رسیدن به روز ۳ آنبوردینگ. این لیدها بهترین کاندید تماس تیم مشاوره هستند.
      </p>
    </div>
  );
}
