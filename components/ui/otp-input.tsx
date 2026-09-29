'use client';
import {useRef} from 'react';
export function otpDigits(text:string){return text.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/\D/g,'');}
export default function OtpInput({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const refs=useRef<(HTMLInputElement|null)[]>([]);
 const digits=Array.from({length:6},(_,i)=>value[i]?.trim()||'');
 function enter(text:string,index:number){const incoming=otpDigits(text);if(!incoming){const next=[...digits];next[index]='';onChange(next.map(x=>x||' ').join(''));return;}const start=incoming.length===6?0:index;const next=[...digits];[...incoming.slice(0,6-start)].forEach((c,n)=>next[start+n]=c);onChange(next.map(x=>x||' ').join(''));refs.current[Math.min(5,start+incoming.length)]?.focus();}
 return <fieldset className="otp-field"><legend className="mb-3 text-sm">کد شش‌رقمی</legend><div className="otp-digits" dir="ltr">{digits.map((digit,i)=><input key={i} ref={el=>{refs.current[i]=el;}} aria-label={`رقم ${(i+1).toLocaleString('fa-IR')} کد ورود`} autoFocus={i===0} inputMode="numeric" autoComplete={i===0?'one-time-code':'off'} required pattern="[0-9۰-۹٠-٩]" maxLength={6} value={digit?Number(digit).toLocaleString('fa-IR'):''} onFocus={e=>e.currentTarget.select()} onChange={e=>enter(e.target.value,i)} onPaste={e=>{e.preventDefault();enter(e.clipboardData.getData('text'),i);}} onKeyDown={e=>{if(e.key==='Backspace'&&!digits[i]&&i>0){e.preventDefault();refs.current[i-1]?.focus();}if(e.key==='ArrowLeft'&&i>0){e.preventDefault();refs.current[i-1]?.focus();}if(e.key==='ArrowRight'&&i<5){e.preventDefault();refs.current[i+1]?.focus();}}}/>)}</div></fieldset>;
}
