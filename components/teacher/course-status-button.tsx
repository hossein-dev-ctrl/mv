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
      DRAFT: "دوره به حالت پیش‌نویس برمی‌گردد و دسترسی یادگیری دانش‌آموزان نیز تا انتشار دوباره متوقف می‌شود.",
      PUBLISHED: "دوره منتشر می‌شود و برای دانشجویان قابل مشاهده خواهد بود.",
      ARCHIVED: "دوره آرشیو می‌شود؛ ثبت‌نام جدید و دسترسی یادگیری دانش‌آموزان تا انتشار دوباره متوقف خواهند شد.",
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
    <div aria-busy={loading} className="flex flex-wrap items-center gap-2">
      {loading && <span role="status" className="text-xs text-slate-500">در حال تغییر وضعیت…</span>}
      {status !== "DRAFT" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => changeStatus("DRAFT")}
          className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          انتقال به پیش‌نویس
        </button>
      )}

      {status !== "PUBLISHED" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => changeStatus("PUBLISHED")}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
        >
          انتشار دوره
        </button>
      )}

      {status !== "ARCHIVED" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => changeStatus("ARCHIVED")}
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          آرشیو دوره
        </button>
      )}
    </div>
  );
}
