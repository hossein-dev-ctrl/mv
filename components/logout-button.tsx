"use client";


import ThemeIcon from '@/components/panel/theme-icon';
import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("خروج انجام نشد. دوباره تلاش کنید.");
      // Full navigation clears cached layouts from the previous account.
      window.location.replace("/login");
    } catch {
      setError("خروج انجام نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-56 shrink-0">
      <button
      type="button"
      onClick={logout}
      disabled={loading}
      aria-busy={loading}
      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-rose-600 disabled:cursor-wait disabled:opacity-60"
    ><ThemeIcon name="logout" className="me-2 h-4 w-4"/>
      {loading ? "در حال خروج…" : "خروج از حساب"}
    </button>
    {error && <p role="alert" className="mt-2 text-xs leading-5 text-rose-700">{error}</p>}
    </div>
  );
}
