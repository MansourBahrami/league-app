export interface SequenceVideo {
  id: string;
  title: string;
  grades: string[];
}

/**
 * اولین ویدیوی قبلیِ تکمیل‌نشده در دسته را برمی‌گرداند. ترتیب آرایه همان
 * ترتیب مدیریتی دسته است و ویدیوهای نامرتبط با پایه کاربر در مسیر او نیستند.
 */
export function findVideoSequenceBlocker(
  videos: SequenceVideo[],
  currentVideoId: string,
  completedVideoIds: ReadonlySet<string>,
  grade: string | null,
): SequenceVideo | null {
  const visibleVideos = videos.filter(
    (video) => video.grades.length === 0 || (!!grade && video.grades.includes(grade)),
  );
  const currentIndex = visibleVideos.findIndex((video) => video.id === currentVideoId);
  if (currentIndex <= 0) return null;

  return visibleVideos
    .slice(0, currentIndex)
    .find((video) => !completedVideoIds.has(video.id)) ?? null;
}
