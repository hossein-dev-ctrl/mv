"use client";

import { useEffect, useState } from "react";

type Props = {
  lessonId: string;
  children: React.ReactNode;
};

export default function LessonView({ lessonId, children }: Props) {
  const [error, setError] = useState("");

  useEffect(() => {
    async function startLesson() {
      try {
        const response = await fetch(`/api/lessons/${lessonId}/start`, {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json();

          setError(data.message || "خطا در شروع درس");
        }
      } catch {
        setError("خطا در ارتباط با سرور");
      }
    }

    startLesson();
  }, [lessonId]);

  return (
    <>
      {children}

      {error && <p className="mt-4 text-sm text-red-600">❌ {error}</p>}
    </>
  );
}
