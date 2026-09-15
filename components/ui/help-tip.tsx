"use client";
import {useId,useState} from 'react';
export default function HelpTip({text}:{text:string}) {
 const id=useId();const [open,setOpen]=useState(false);
 return <span className="relative ms-2 inline-flex" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
 <button type="button" aria-label="توضیح این عنوان" aria-expanded={open} aria-describedby={open?id:undefined} className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs text-slate-600 focus-visible:outline-2 focus-visible:outline-indigo-500" onClick={()=>setOpen(true)} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>؟</button>
 {open&&<span id={id} role="tooltip" className="absolute start-0 top-7 z-30 w-56 max-w-[70vw] rounded-xl bg-slate-900 p-3 text-right text-xs font-normal leading-7 text-white shadow-lg">{text}</span>}
 </span>;
}
