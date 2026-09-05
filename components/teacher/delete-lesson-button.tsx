"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  lessonId: string;
};

export default function DeleteLessonButton({ lessonId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "آیا از حذف این درس مطمئن هستید؟ تمام فایل‌ها و پیشرفت‌های مربوط به آن نیز حذف می‌شوند.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/teacher/lessons/${lessonId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "حذف درس ناموفق بود.");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 transition hover:bg-red-100 disabled:opacity-50"
    >
      {loading ? "در حال حذف..." : "🗑 حذف"}
    </button>
  );
}
