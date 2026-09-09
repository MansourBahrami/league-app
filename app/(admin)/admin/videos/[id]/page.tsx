import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import VideoForm from "@/components/admin/VideoForm";


interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditVideoPage({ params }: Props) {
  const { id } = await params;
  const [video, categories] = await Promise.all([
    prisma.video.findUnique({ where: { id } }),
    prisma.videoCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true },
    }),
  ]);
  if (!video) notFound();

  return (
    <VideoForm
      categories={categories}
      initial={{
        id: video.id,
        categoryId: video.categoryId,
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
