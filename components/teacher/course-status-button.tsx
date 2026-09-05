"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type Props = {
  courseId: string;
  status: CourseStatus;
};

export default function CourseStatusButton({ courseId, status }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function changeStatus(newStatus: CourseStatus) {
    const messages = {
      DRAFT: "دوره به حالت پیش‌نویس برمی‌گردد.",
      PUBLISHED: "دوره منتشر می‌شود و برای دانشجویان قابل مشاهده خواهد بود.",
      ARCHIVED: "دوره آرشیو می‌شود و ثبت‌نام جدید متوقف خواهد شد.",
    };

    if (!window.confirm(messages[newStatus])) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/teacher/courses/${courseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "تغییر وضعیت دوره ناموفق بود.");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "DRAFT" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => changeStatus("DRAFT")}
          className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          📝 پیش‌نویس
        </button>
      )}

      {status !== "PUBLISHED" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => changeStatus("PUBLISHED")}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
        >
          🟢 انتشار
        </button>
      )}

      {status !== "ARCHIVED" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => changeStatus("ARCHIVED")}
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600 disabled:opacity-50"
        >
          📦 آرشیو
        </button>
      )}
    </div>
  );
}
