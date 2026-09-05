"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  sectionId: string;
};

export default function DeleteSectionButton({ sectionId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "⚠️ آیا از حذف این فصل مطمئن هستید؟\n\nتمام درس‌ها، فایل‌ها و اطلاعات مربوط به این فصل نیز حذف خواهند شد.\n\nاین عملیات قابل بازگشت نیست.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/teacher/sections/${sectionId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "حذف فصل ناموفق بود.");
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
      disabled={loading}
      onClick={handleDelete}
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 disabled:opacity-50"
    >
      {loading ? "در حال حذف..." : "🗑 حذف فصل"}
    </button>
  );
}
