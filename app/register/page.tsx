"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "ثبت‌نام ناموفق بود");
      }

      router.push("/login");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "خطایی هنگام ثبت‌نام رخ داد",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-lg">
            🎓
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            ایجاد حساب کاربری
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            برای شروع یادگیری ثبت‌نام کنید
          </p>
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-xl ring-1 ring-slate-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                نام و نام خانوادگی
              </label>

              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="مثلاً حسین حسینی"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium">
                شماره موبایل
              </label>

              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="09121234567"
                required
                dir="ltr"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                رمز عبور
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="حداقل ۶ کاراکتر"
                required
                minLength={6}
                dir="ltr"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm">
            <span className="text-slate-500">قبلاً ثبت‌نام کرده‌اید؟</span>

            <a href="/login" className="mr-1 font-medium text-indigo-600">
              ورود به حساب
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
