"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  courseId: string;
};

export default function DeleteCourseButton({ courseId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "⚠️ آیا از حذف این دوره مطمئن هستید؟\n\nتمام فصل‌ها، درس‌ها، ویدئوها، فایل‌ها و ثبت‌نام‌های مربوط به این دوره حذف خواهند شد.\n\nاین عملیات قابل بازگشت نیست.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/teacher/courses/${courseId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "حذف دوره ناموفق بود.");
      }

      router.push("/teacher");
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "خطایی هنگام حذف دوره رخ داد.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-xl bg-red-50 px-5 py-3 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "در حال حذف..." : "🗑 حذف دوره"}
    </button>
  );
}
