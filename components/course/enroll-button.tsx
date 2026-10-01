"use client";


import ThemeIcon from '@/components/panel/theme-icon';
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  courseId: string;
  price: number;
  isLoggedIn: boolean;
};

export default function EnrollButton({ courseId, price, isLoggedIn }: Props) {
  const router = useRouter();

  const [code,setCode]=useState("");
  const [quote,setQuote]=useState<number|null>(null);
  const [checking,setChecking]=useState(false);
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
          courseId,code,
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

    } finally { setLoading(false); }
  }

  return (
    <div className="assessment-form space-y-3">
      {price>0&&<div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4"><label>کد تخفیف<input dir="ltr" maxLength={40} value={code} onChange={e=>{setCode(e.target.value);setQuote(null);}} placeholder="کد تخفیف"/></label><button type="button" disabled={checking||loading} className="panel-action mt-3" onClick={async()=>{setChecking(true);setError('');try{const res=await fetch('/api/coupons/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId,code})});const data=await res.json();if(!res.ok)throw Error(data.message);setQuote(data.amount);}catch(e){setQuote(null);setError(e instanceof Error?e.message:'خطا');}finally{setChecking(false);}}}><ThemeIcon name="check" className="h-4 w-4"/>بررسی کد</button><p className="min-h-8 pt-2 text-sm">{quote!==null?`مبلغ قابل پرداخت: ${quote.toLocaleString('fa-IR')} تومان`:'کد روی قیمت فعلی دوره اعمال می‌شود.'}</p></div>}

      <button
        onClick={handleEnroll}
        disabled={loading}
        className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      ><ThemeIcon name="check" className="me-2 h-4 w-4"/>
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
