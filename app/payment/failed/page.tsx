import Link from "next/link";

export default function PaymentFailedPage() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gray-50 p-6"
    >
      <div className="w-full max-w-lg rounded-3xl border bg-white p-8 text-center shadow-sm">
        <div className="text-6xl">❌</div>

        <h1 className="mt-5 text-3xl font-bold text-red-600">
          پرداخت ناموفق بود
        </h1>

        <p className="mt-3 text-gray-600">
          پرداخت انجام نشد یا توسط شما لغو شد.
        </p>

        <div className="mt-8 flex gap-3">
          <Link
            href="/courses"
            className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-white"
          >
            بازگشت به دوره‌ها
          </Link>

          <Link
            href="/dashboard"
            className="flex-1 rounded-xl border px-5 py-3"
          >
            داشبورد
          </Link>
        </div>
      </div>
    </main>
  );
}
