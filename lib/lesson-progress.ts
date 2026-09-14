import { prisma } from "@/lib/prisma";

// Call only after checking lesson access. Conditional writes preserve completed
// lessons and first timestamps even when start/video requests arrive together.
export async function recordLessonActivity(
  enrollmentId: string,
  lessonId: string,
  videoCompleted = false,
) {
  const now = new Date();
  const where = { enrollmentId, lessonId };

  return prisma.$transaction(async (tx) => {
    await tx.lessonProgress.createMany({
      data: [{ ...where, status: "IN_PROGRESS", startedAt: now }],
      skipDuplicates: true,
    });

    await tx.lessonProgress.updateMany({
      where: { ...where, status: "NOT_STARTED" },
      data: { status: "IN_PROGRESS" },
    });

    await tx.lessonProgress.updateMany({
      where: { ...where, status: "IN_PROGRESS", startedAt: null },
      data: { startedAt: now },
    });

    if (videoCompleted) {
      await tx.lessonProgress.updateMany({
        where: { ...where, videoCompletedAt: null },
        data: { videoCompletedAt: now },
      });
    }

    return tx.lessonProgress.findUniqueOrThrow({
      where: { enrollmentId_lessonId: where },
    });
  });
}
