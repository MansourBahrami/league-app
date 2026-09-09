import VideoForm from "@/components/admin/VideoForm";
import { prisma } from "@/lib/db";

export default async function NewVideoPage() {
  const categories = await prisma.videoCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true },
  });
  return <VideoForm categories={categories} />;
}
