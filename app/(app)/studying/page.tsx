import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getActiveFocusSnapshot } from "@/lib/focus";
import ActiveStudents from "@/components/focus/ActiveStudents";


export default async function StudyingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const snapshot = await getActiveFocusSnapshot();

  return (
    <div className="px-4 pb-4">
      <ActiveStudents
        initialSnapshot={snapshot}
        currentUserId={session.userId}
      />
    </div>
  );
}
