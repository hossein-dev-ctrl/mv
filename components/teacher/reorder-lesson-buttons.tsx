"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  lessonId: string;
  isFirst: boolean;
  isLast: boolean;
};

export default function ReorderLessonButtons({
  lessonId,
  isFirst,
  isLast,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function move(direction: "up" | "down") {
    setLoading(true);

    try {
      const response = await fetch(`/api/teacher/lessons/${lessonId}/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          direction,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "جابجایی ناموفق بود.");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-1">
      <button
        type="button"
        disabled={loading || isFirst}
        onClick={() => move("up")}
        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ↑
      </button>

      <button
        type="button"
        disabled={loading || isLast}
        onClick={() => move("down")}
        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ↓
      </button>
    </div>
  );
}
