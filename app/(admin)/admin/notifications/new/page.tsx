import NotificationForm from "@/components/admin/NotificationForm";
import { prisma } from "@/lib/db";
import { connection } from "next/server";

export default async function NewNotificationPage() {
  await connection();
  const videoCategories = await prisma.videoCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true },
  });
  return <NotificationForm videoCategories={videoCategories} />;
}
