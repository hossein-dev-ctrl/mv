import { calculateProgress } from "@/lib/course-progress";

type Lesson = { id: string; title: string };
type Progress = { lessonId: string; status: string; startedAt: Date | null };

// Lessons must contain only published lessons, ordered by section then lesson.
export function getLearningSummary(
  lessons: Lesson[],
  progresses: Progress[],
  courseStatus: string,
) {
  const progressByLesson = new Map(progresses.map((item) => [item.lessonId, item]));
  const completedLessons = lessons.filter(
    (lesson) => progressByLesson.get(lesson.id)?.status === "COMPLETED",
  ).length;
  const totalLessons = lessons.length;
  const isCompleted = totalLessons > 0 && completedLessons === totalLessons;
  const hasStarted = lessons.some((lesson) => {
    const progress = progressByLesson.get(lesson.id);
    return Boolean(progress?.startedAt) ||
      progress?.status === "IN_PROGRESS" || progress?.status === "COMPLETED";
  });
  // The first unfinished lesson has no unfinished predecessor, so it satisfies
  // the same sequential access rule as getLessonAccess.
  const nextLesson = courseStatus === "PUBLISHED"
    ? lessons.find((lesson) => progressByLesson.get(lesson.id)?.status !== "COMPLETED") ?? null
    : null;
  const state = courseStatus !== "PUBLISHED" ? "unavailable"
    : totalLessons === 0 ? "empty"
    : isCompleted ? "completed"
    : hasStarted ? "in-progress" : "not-started";

  return { completedLessons, totalLessons, isCompleted, hasStarted, nextLesson,
    percentage: calculateProgress(completedLessons, totalLessons), state } as const;
}
