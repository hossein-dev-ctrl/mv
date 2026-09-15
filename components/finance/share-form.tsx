"use client";
import NumberInput from "@/components/ui/number-input";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ShareForm({ teacherId, percent }: { teacherId: string; percent: number | null }) {
  const [value, setValue] = useState(percent === null ? "" : String(percent));
  const [apply, setApply] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return <form className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-5" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/teachers/${teacherId}/share`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ percent: Number(value), applyUnallocated: apply }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "ذخیره انجام نشد.");
      setMessage(result.message); setApply(false); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "ارتباط برقرار نشد."); }
    finally { setBusy(false); }
  }}>
    <div><label htmlFor={`share-${teacherId}`} className="mb-2 block text-sm">درصد سهم مدرس</label><NumberInput id={`share-${teacherId}`} required unit="درصد" type="number" min="0" max="100" step="1" value={value} onChange={event => setValue(event.target.value)} className="w-28 rounded-xl border border-slate-300 px-3 py-2" /></div>
    <label className="flex items-center gap-2 py-2 text-xs leading-6"><input type="checkbox" checked={apply} onChange={event => setApply(event.target.checked)} />برای پرداخت‌های موفق قبلی که سهم ندارند هم اعمال شود</label>
    <button disabled={busy} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "در حال ذخیره…" : "ذخیرهٔ سهم"}</button>
    {message && <p role="status" className="w-full text-sm text-slate-700">{message}</p>}
  </form>;
}
