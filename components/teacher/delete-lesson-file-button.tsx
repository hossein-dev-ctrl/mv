"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  fileId: string;
};

export default function DeleteLessonFileButton({ fileId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm("آیا از حذف این فایل مطمئن هستید؟");

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/teacher/lesson-files/${fileId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "حذف فایل ناموفق بود.");
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
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 disabled:opacity-50"
    >
      {loading ? "..." : "🗑"}
    </button>
  );
}
