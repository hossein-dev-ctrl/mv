import { prisma } from "@/lib/prisma";

export async function getLessonAccess(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: {
      id: lessonId,
    },

include: {
  section: {
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
        },
      },
    },
  },

  files: true,
},
  });

  if (!lesson) {
    return {
      allowed: false,
      reason: "LESSON_NOT_FOUND" as const,
    };
  }

  if (lesson.status !== "PUBLISHED") {
    return {
      allowed: false,
      reason: "LESSON_NOT_PUBLISHED" as const,
    };
  }

  const course = lesson.section.course;

  if (course.status !== "PUBLISHED") {
    return {
      allowed: false,
      reason: "COURSE_NOT_PUBLISHED" as const,
    };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: course.id,
      },
    },

    include: {
      progresses: true,
    },
  });

  if (!enrollment || enrollment.status === "CANCELLED") {
    return {
      allowed: false,
      reason: "NOT_ENROLLED" as const,
      course,
    };
  }

  /*
   * تمام درس‌های منتشرشده دوره
   */

  const lessons = await prisma.lesson.findMany({
    where: {
      section: {
        courseId: course.id,
      },
      status: "PUBLISHED",
    },

    orderBy: [
      {
        section: {
          order: "asc",
        },
      },
      {
        order: "asc",
      },
    ],

    select: {
      id: true,
      title: true,
      order: true,
      sectionId: true,
    },
  });

  const currentIndex = lessons.findIndex((item) => item.id === lessonId);

  if (currentIndex === -1) {
    return {
      allowed: false,
      reason: "LESSON_NOT_FOUND" as const,
      course,
    };
  }

  /*
   * اولین درس همیشه قابل مشاهده است.
   */

  if (currentIndex === 0) {
    return {
      allowed: true,
      lesson,
      course,
      enrollment,
      lessons,
    };
  }

  /*
   * درس قبلی
   */

  const previousLesson = lessons[currentIndex - 1];

  const previousProgress = enrollment.progresses.find(
    (progress) => progress.lessonId === previousLesson.id,
  );

  /*
   * اگر درس قبلی کامل نشده باشد،
   * درس فعلی قفل است.
   */

  if (previousProgress?.status !== "COMPLETED") {
    return {
      allowed: false,
      reason: "LESSON_LOCKED" as const,
      lesson,
      course,
      enrollment,
      lessons,
      previousLesson,
    };
  }

  return {
    allowed: true,
    lesson,
    course,
    enrollment,
    lessons,
  };
}
