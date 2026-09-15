"use client";
import JalaliDateInput from "@/components/ui/jalali-date-input";
import NumberInput from "@/components/ui/number-input";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Field={name:string;label:string;type?:"text"|"number"|"datetime-local";value?:string|number;min?:number;max?:number};
export default function LedgerForm({action,fixed={},fields=[],label,disabled=false,confirmText}:{confirmText?:string;action:string;fixed?:Record<string,string>;fields?:Field[];label:string;disabled?:boolean}) {
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const router=useRouter();
  return <form className="mt-4 flex flex-wrap items-start gap-3" onSubmit={async event=>{
    event.preventDefault();if(confirmText&&!confirm(confirmText))return;const form=event.currentTarget;const data=new FormData(form);setBusy(true);setMessage("");
    try {
      const body:Record<string,string|number>={action,...fixed};
      for(const field of fields){const value=String(data.get(field.name)??"");if(field.type==="datetime-local"&&(!value||Number.isNaN(new Date(value).getTime())))throw new Error("تاریخ و ساعت شمسی معتبر انتخاب کنید.");body[field.name]=field.type==="number"?Number(value):field.type==="datetime-local"?new Date(value).toISOString():value;}
      const result=await fetch('/api/finance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const json=await result.json();if(!result.ok)throw new Error(json.message||"ثبت انجام نشد.");setMessage(json.message);router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"ارتباط برقرار نشد.");}finally{setBusy(false);}
  }}>
    {fields.map(field=><div role="group" aria-label={field.label} key={field.name} className="flex min-w-0 flex-col gap-2 text-xs text-slate-600"><span>{field.label}</span>{field.type==="number" ? <NumberInput key={`${field.name}-${field.value}`} required aria-label={field.label} name={field.name} defaultValue={field.value} min={field.min} max={field.max} unit="تومان" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:w-44" /> : field.type==="datetime-local" ? <JalaliDateInput name={field.name}/> : <input required aria-label={field.label} name={field.name} type="text" defaultValue={field.value} min={field.min} max={field.max} maxLength={500} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:w-44" />}</div>)}
    <button disabled={busy||disabled} className="mt-6 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-40">{busy?"در حال ثبت…":label}</button>
    {message&&<p role="status" className="w-full text-sm text-slate-700">{message}</p>}
  </form>;
}
