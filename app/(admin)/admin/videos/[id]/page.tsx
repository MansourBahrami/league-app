import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import VideoForm from "@/components/admin/VideoForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditVideoPage({ params }: Props) {
  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) notFound();

  return (
    <VideoForm
      initial={{
        id: video.id,
        title: video.title,
        description: video.description,
        day: video.day,
        durationMin: video.durationMin,
        hlsUrl: video.hlsUrl,
        thumbnailUrl: video.thumbnailUrl,
        grades: video.grades,
        ctaLabel: video.ctaLabel,
        ctaUrl: video.ctaUrl,
        isActive: video.isActive,
      }}
    />
  );
}
