"use client";
import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeIcon from "@/components/panel/theme-icon";
import OtpInput from "@/components/ui/otp-input";
import { Spinner } from "@/components/panel/loading";
export default function Login() {
  const router = useRouter();
  const [needsName, setNeedsName] = useState(false),
    [name, setName] = useState("");
  const [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [expires, setExpires] = useState<number | null>(null),
    [seconds, setSeconds] = useState(300),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!expires) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
      setSeconds(left);
      if (!left) {
        setExpires(null);
        setCode("");
        setMessage("زمان کد تمام شد؛ دوباره شماره را وارد کنید.");
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expires]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (needsName) {
        const res = await fetch("/api/auth/name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) throw Error(data.message);
        const target = new URLSearchParams(window.location.search).get(
          "redirect",
        );
        router.replace(
          target &&
            target.startsWith("/") &&
            !target.startsWith("//") &&
            !target.includes("\\")
            ? target
            : "/dashboard",
        );
        router.refresh();
        return;
      }
      const res = await fetch(
        `/api/auth/otp/${expires ? "verify" : "request"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(expires ? { code } : { phone }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.restart) {
          setExpires(null);
          setCode("");
        }
        throw Error(data.message || "خطا در برقراری ارتباط");
      }
      if (!expires) {
        setCode("");
        setSeconds(300);
        setExpires(new Date(data.expiresAt).getTime());
        setMessage("کد ورود پیامک شد.");
      } else {
        if (data.needsName) {
          setExpires(null);
          setNeedsName(true);
          return;
        }
        const target = new URLSearchParams(window.location.search).get(
          "redirect",
        );
        const home =
          data.user.role === "ADMIN"
            ? "/admin"
            : data.user.role === "TEACHER"
              ? "/teacher"
              : "/dashboard";
        router.replace(
          target &&
            target.startsWith("/") &&
            !target.startsWith("//") &&
            !target.includes("\\")
            ? target
            : home,
        );
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "ارتباط برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <header>
          <ThemeIcon name="graduation" className="h-12 w-12" />
          <h1>ورود یا ثبت‌نام</h1>
          <p>با شمارهٔ موبایل وارد فضای یادگیری شوید.</p>
        </header>
        <form onSubmit={submit} className="assessment-form space-y-5 p-6">
          <fieldset disabled={busy} className="space-y-5">
            {needsName ? (
              <label>
                نام شما در سایت
                <input
                  autoFocus
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            ) : expires ? (
              <>
                <p className="text-sm">
                  کد ارسال‌شده به <bdi>{phone}</bdi> را وارد کنید.
                </p>
                <OtpInput value={code} onChange={setCode} />
                <p className="text-sm text-indigo-700">
                  زمان باقی‌مانده: {seconds.toLocaleString("fa-IR")} ثانیه
                </p>
              </>
            ) : (
              <label>
                شمارهٔ موبایل
                <input
                  autoFocus
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  required
                  maxLength={16}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            )}
            <button
              className="panel-action panel-action-primary w-full"
              type="submit"
            >
              {busy ? <Spinner small /> : <ThemeIcon name="check" />}
              {needsName
                ? "ذخیرهٔ نام و ورود"
                : expires
                  ? "تأیید کد و ورود"
                  : "تأیید و ارسال کد"}
            </button>
            {expires && (
              <button
                type="button"
                className="panel-action w-full"
                onClick={() => {
                  setExpires(null);
                  setCode("");
                }}
              >
                اصلاح شماره / درخواست مجدد
              </button>
            )}
          </fieldset>
          <p
            role="status"
            className="min-h-8 text-sm leading-7 text-indigo-900"
          >
            {message}
          </p>
          <p className="text-xs leading-7 text-slate-500">
            اعتبار کد ۵ دقیقه است. با سه خطا به مرحلهٔ شماره برمی‌گردید؛ پس از
            ده خطای متوالی، رفع مسدودی توسط پشتیبانی لازم است.
          </p>
          <Link className="panel-action" href="/courses">
            مشاهدهٔ دوره‌ها
          </Link>
        </form>
      </section>
    </main>
  );
}
