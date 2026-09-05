"use client";

import { useState } from "react";

export default function TestSmsPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  async function handleSendSms() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
        }),
      });

      const data = await response.json();

      setResult(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow">
        <h1 className="mb-6 text-2xl font-bold">تست ارسال پیامک</h1>

        <label className="mb-2 block font-medium">شماره موبایل</label>

        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09123456789"
          className="mb-4 w-full rounded-lg border p-3 text-left"
          dir="ltr"
        />

        <button
          type="button"
          onClick={handleSendSms}
          disabled={loading || !phone}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "در حال ارسال..." : "ارسال پیامک تست"}
        </button>

        {result !== null && (
          <div className="mt-6">
            <h2 className="mb-2 font-bold">نتیجه:</h2>

            <pre
              dir="ltr"
              className="max-h-[500px] overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-white"
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
