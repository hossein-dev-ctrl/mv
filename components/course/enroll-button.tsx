"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  courseId: string;
  price: number;
  isLoggedIn: boolean;
};

export default function EnrollButton({ courseId, price, isLoggedIn }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEnroll() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * دوره رایگان
       */

      if (price === 0) {
        const response = await fetch("/api/enrollments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            courseId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "ثبت‌نام انجام نشد.");
        }

        router.refresh();
        return;
      }

      /*
       * دوره پولی
       */

      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "ایجاد پرداخت ناموفق بود.");
      }

      /*
       * انتقال به درگاه
       */

      router.push(data.paymentUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "خطایی رخ داد.");

      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading
          ? "در حال انتقال..."
          : price > 0
            ? "💳 پرداخت و ثبت‌نام"
            : "🎓 ثبت‌نام رایگان"}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">❌ {error}</p>}
    </div>
  );
}
