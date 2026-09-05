"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  lessonId: string;
};

export default function CompleteLessonButton({ lessonId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function completeLesson() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/lessons/${lessonId}/complete`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تکمیل درس ناموفق بود.");
      }

      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={completeLesson}
        disabled={loading}
        className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "در حال ثبت..." : "✅ تکمیل درس"}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">❌ {error}</p>}
    </div>
  );
}
