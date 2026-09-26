"use client";

import ThemeIcon from '@/components/panel/theme-icon';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function InterestForm({courseId,registered}:{courseId:string;registered:boolean}) {
 const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const router=useRouter();
 return <form className="max-w-lg space-y-3 rounded-2xl border border-indigo-200 bg-white p-5" onSubmit={async e=>{
 e.preventDefault();const data=new FormData(e.currentTarget);setBusy(true);setMessage('');
 try{const res=await fetch(`/api/courses/${courseId}/interest`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:data.get('name'),phone:data.get('phone'),consent:data.get('consent')==='on'})});const body=await res.json();setMessage(body.message);if(res.ok)router.refresh();}catch{setMessage('ارتباط برقرار نشد.');}finally{setBusy(false);}
 }}>
 <h2 className="font-bold">{registered?'درخواست شما ثبت شده است':'برای برگزاری این دوره اعلام علاقه‌مندی کنید'}</h2>
 <p className="text-sm leading-7 text-slate-600">این درخواست رایگان است و ثبت‌نام قطعی یا تضمین برگزاری نیست. اطلاعات تماس برای اطلاع‌رسانی آغاز دوره نگه‌داری می‌شود.</p>
 {!registered&&<><label className="block text-sm">نام و نام خانوادگی<input name="name" required minLength={3} maxLength={100} className="mt-2 block w-full rounded-xl border p-3"/></label><label className="block text-sm">موبایل<input name="phone" required inputMode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" className="mt-2 block w-full rounded-xl border p-3"/></label><label className="flex gap-2 text-xs leading-7"><input type="checkbox" name="consent" required/>با تماس یا پیامک دربارهٔ شروع همین دوره موافقم.</label><button disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm text-white disabled:opacity-40"><ThemeIcon name="check" className="me-2 h-4 w-4"/>{busy?'در حال ثبت…':'ثبت پیش‌درخواست'}</button></>}
 {message&&<p role="status" className="text-sm">{message}</p>}</form>;
}
