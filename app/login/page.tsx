"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "ورود ناموفق بود");
      }

      // انتقال بر اساس نقش
      if (result.user.role === "TEACHER") {
        router.push("/teacher");
      } else if (result.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "خطایی هنگام ورود رخ داد",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-100 px-4"
    >
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-lg">
            🎓
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            ورود به حساب کاربری
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            برای ادامه وارد حساب خود شوید
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white p-7 shadow-xl ring-1 ring-slate-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                شماره موبایل
              </label>

              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="09121234567"
                required
                autoComplete="tel"
                dir="ltr"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                رمز عبور
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="رمز عبور"
                required
                autoComplete="current-password"
                dir="ltr"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "در حال ورود..." : "ورود"}
            </button>
          </form>

          {/* Register */}
          <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm">
            <span className="text-slate-500">حساب کاربری ندارید؟</span>

            <a
              href="/register"
              className="mr-1 font-medium text-indigo-600 hover:text-indigo-700"
            >
              ثبت‌نام کنید
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
