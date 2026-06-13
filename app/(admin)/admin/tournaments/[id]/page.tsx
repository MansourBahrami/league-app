import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import TournamentForm from "@/components/admin/TournamentForm";

export const dynamic = "force-dynamic";

/** تبدیل Date به رشته‌ی datetime-local (در منطقه‌ی زمانی محلی سرور). */
function toLocalInput(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default async function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await prisma.tournament.findUnique({ where: { id } });
  if (!t) notFound();

  return (
    <TournamentForm
      initial={{
        id: t.id,
        name: t.name,
        description: t.description,
        startAt: toLocalInput(t.startAt),
        endAt: toLocalInput(t.endAt),
        entryCost: t.entryCost,
        prizeXp: t.prizeXp,
        prizeCoins: t.prizeCoins,
        levels: t.levels,
        isActive: t.isActive,
      }}
    />
  );
}
