"use client";

import { useState } from "react";

type Props = {
  lessonId: string;
  videoUrl: string;
  disabled?: boolean;
  onVideoCompleted: () => void;
};

export default function LessonVideo({
  lessonId,
  videoUrl,
  disabled = false,
  onVideoCompleted,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  async function handleEnded() {
    if (loading || completed || disabled) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/lessons/${lessonId}/video-complete`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "ثبت پایان ویدئو ناموفق بود.");
      }

      setCompleted(true);
      onVideoCompleted();
    } catch (error) {
      setError(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <video
        controls
        controlsList="nodownload"
        className="w-full rounded-2xl bg-black"
        src={videoUrl}
        onEnded={handleEnded}
      />

      {loading && (
        <p className="mt-3 text-sm text-gray-500">در حال ثبت پایان ویدئو...</p>
      )}

      {completed && (
        <div className="mt-3 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-700">
          ✅ ویدئو به طور کامل مشاهده شد.
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">❌ {error}</p>}
    </div>
  );
}
