"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function MockPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentId = searchParams.get("paymentId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function pay(success: boolean) {
    if (!paymentId) {
      setError("شناسه پرداخت وجود ندارد.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/payments/mock/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId,
          success,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "پرداخت ناموفق بود.");
      }

      router.push(data.redirectUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "خطایی رخ داد.");

      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gray-100 p-6"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
        <h1 className="text-2xl font-bold">💳 درگاه پرداخت آزمایشی</h1>

        <p className="mt-4 text-gray-500">
          این صفحه فعلاً شبیه‌ساز درگاه بانکی است.
        </p>

        <div className="mt-8 space-y-3">
          <button
            disabled={loading}
            onClick={() => pay(true)}
            className="w-full rounded-xl bg-green-600 px-5 py-3 font-medium text-white"
          >
            ✅ پرداخت موفق
          </button>

          <button
            disabled={loading}
            onClick={() => pay(false)}
            className="w-full rounded-xl bg-red-600 px-5 py-3 font-medium text-white"
          >
            ❌ پرداخت ناموفق
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">❌ {error}</p>}
      </div>
    </main>
  );
}

export default function MockPaymentPage() {
  return (
    <Suspense
      fallback={
        <main
          dir="rtl"
          className="flex min-h-screen items-center justify-center bg-gray-100"
        >
          <p>در حال بارگذاری درگاه...</p>
        </main>
      }
    >
      <MockPaymentContent />
    </Suspense>
  );
}
