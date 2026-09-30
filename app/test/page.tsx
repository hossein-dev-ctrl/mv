"use client";

import { FormEvent, useState } from "react";

export default function TestSmsPage() {
  const [phone, setPhone] = useState("09332233541");
  const [patternCode, setPatternCode] = useState("");
  const [code, setCode] = useState("354209");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/test-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          patternCode,
          code,
        }),
      });

      const data = await response.json();

      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-bold">تست ارسال پیامک</h1>

        <p className="mb-6 text-sm text-gray-500">
          این صفحه فقط برای تست مستقیم سرویس FarazSMS ساخته شده است.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              شماره موبایل
            </label>

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09332233541"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Pattern Code / UID
            </label>

            <input
              value={patternCode}
              onChange={(e) => setPatternCode(e.target.value)}
              placeholder="مثلاً SJ3FgPrE0C"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
            />

            <p className="mt-1 text-xs text-gray-500">
              این همان کد خود پترن در پنل فراز است، نه نام متغیر.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">کد OTP</label>

            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              placeholder="354209"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
            />

            <p className="mt-1 text-xs text-gray-500">
              این مقدار به صورت Number ارسال می‌شود.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? "در حال ارسال..." : "ارسال پیامک تستی"}
          </button>
        </form>

        {result && (
          <div className="mt-6">
            <h2 className="mb-2 font-semibold">نتیجه:</h2>

            <pre
              dir="ltr"
              className="overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-white"
            >
              {result}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
