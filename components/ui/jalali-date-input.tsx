"use client";
import {useState} from 'react';
import {jalaliParts,jalaliMonths,jalaliDays,jalaliToIso} from '@/lib/jalali-date';
import {faDigits} from '@/lib/persian-numbers';
export default function JalaliDateInput({name}:{name:string}) {
 const [date,setDate]=useState(()=>jalaliParts(new Date()));
 const [today]=useState(()=>jalaliParts(new Date()));
 const [hour,setHour]=useState('');const [minute,setMinute]=useState('');
 let iso='';let error='';
 try {if(hour!==''&&minute!=='')iso=jalaliToIso(date.year,date.month,date.day,Number(hour),Number(minute));}catch{error='این ساعت محلی معتبر نیست؛ ساعت دیگری انتخاب کنید.';}
 const change=(year:number,month:number)=>setDate({year,month,day:Math.min(date.day,jalaliDays(year,month))});
 const style='min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm';
 return <span className="flex w-full flex-col gap-2 sm:w-80">
  <span className="grid grid-cols-3 gap-2">
   <select aria-label="روز شمسی" className={style} value={date.day} onChange={e=>setDate({...date,day:Number(e.target.value)})}>{Array.from({length:jalaliDays(date.year,date.month)},(_,i)=><option key={i} value={i+1}>{faDigits(i+1)}</option>)}</select>
   <select aria-label="ماه شمسی" className={style} value={date.month} onChange={e=>change(date.year,Number(e.target.value))}>{jalaliMonths.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select>
   <select aria-label="سال شمسی" className={style} value={date.year} onChange={e=>change(Number(e.target.value),date.month)}>{Array.from({length:today.year-1299},(_,i)=>1300+i).map(y=><option key={y} value={y}>{faDigits(y)}</option>)}</select>
  </span>
  <span className="grid grid-cols-2 gap-2">
   <select required aria-label="ساعت به وقت تهران" className={style} value={hour} onChange={e=>setHour(e.target.value)}><option value="">ساعت</option>{Array.from({length:24},(_,i)=><option key={i} value={i}>{faDigits(String(i).padStart(2,'0'))}</option>)}</select>
   <select required aria-label="دقیقه" className={style} value={minute} onChange={e=>setMinute(e.target.value)}><option value="">دقیقه</option>{Array.from({length:60},(_,i)=><option key={i} value={i}>{faDigits(String(i).padStart(2,'0'))}</option>)}</select>
  </span>
  <input type="hidden" name={name} value={iso}/><span className="text-xs text-slate-500">{error||"تقویم شمسی · ساعت تهران"}</span>
 </span>;
}
