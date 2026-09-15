"use client";
import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ChangeEvent } from 'react';
import { faDigits, latinDigits, numberWords } from '@/lib/persian-numbers';
type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'type'> & {type?:string;unit?:string};
export default function NumberInput({value,defaultValue,onChange,name,min,max,step:unusedStep,type:unusedType,unit='',className,...props}:Props){
 void unusedStep;void unusedType;
 const [local,setLocal]=useState(String(defaultValue??''));const input=useRef<HTMLInputElement>(null);const description=useId();
 const raw=String(value??local);const words=numberWords(raw);
 useEffect(()=>{const n=Number(raw);input.current?.setCustomValidity(raw&&(!/^\d+$/.test(raw)||!Number.isSafeInteger(n)||(min!==undefined&&n<Number(min))||(max!==undefined&&n>Number(max)))?'عدد صحیح در محدودهٔ مجاز وارد کنید.':'');},[raw,min,max]);
 return <span className="inline-flex min-w-0 flex-1 flex-col gap-2">
  <input {...props} ref={input} type="text" inputMode="numeric" value={faDigits(raw)} className={className} aria-describedby={[props['aria-describedby'],description].filter(Boolean).join(' ')} onChange={event=>{
    const next=latinDigits(event.target.value);if(!/^\d*$/.test(next))return;setLocal(next);
    if(onChange)onChange({...event,target:{...event.target,value:next},currentTarget:{...event.currentTarget,value:next}} as ChangeEvent<HTMLInputElement>);
  }} />
  {name&&<input type="hidden" name={name} value={raw} />}
  <span id={description} className="number-words text-xs font-normal leading-6 text-indigo-600" aria-live="polite">{words?words+(unit?' '+unit:''):'عدد را وارد کنید'}</span>
 </span>;
}
