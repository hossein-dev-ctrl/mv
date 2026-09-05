"use client";
///////////// اینو حذف کردم اگر خطا نداشتیم حذفش کن
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  courseId: string;
};

export default function ArchiveCourseButton({ courseId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function handleArchive() {
    const confirmed = window.confirm(
      "آیا می‌خواهید این دوره را آرشیو کنید؟\n\nدوره دیگر برای ثبت‌نام جدید نمایش داده نمی‌شود.",
    );

    if (!confirmed) {
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
          status: "ARCHIVED",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "آرشیو دوره ناموفق بود.");
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
      onClick={handleArchive}
      disabled={loading}
      className="rounded-xl bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
    >
      {loading ? "در حال آرشیو..." : "📦 آرشیو دوره"}
    </button>
  );
}
