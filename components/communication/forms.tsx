'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Spinner} from '@/components/panel/loading';

const field='w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
async function send(url:string,body:unknown,method='POST',file?:File){
 if(file&&file.size>5*1024*1024)throw Error('حداکثر حجم فایل ۵ مگابایت است.');
 const multipart=new FormData();if(file){multipart.set('payload',JSON.stringify(body));multipart.set('file',file);}
 const response=await fetch(url,{method,...(file?{body:multipart}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 const data=await response.json();if(!response.ok)throw Error(data.message||'عملیات انجام نشد.');
 window.dispatchEvent(new Event('notifications-changed'));return data;
}
export function ContactPicker({kind='USER',onChange}:{kind?:string;onChange:(id:string)=>void}){
 const [q,setQ]=useState('');const [items,setItems]=useState<{id:string;label:string;role?:string}[]>([]);const [selected,setSelected]=useState('');const [busy,setBusy]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  const timeout=setTimeout(async()=>{setBusy(true);setError('');try{
   const res=await fetch(`/api/communication/contacts?kind=${kind}&q=${encodeURIComponent(q)}`,{signal:controller.signal});
   if(!res.ok)throw Error('فهرست گیرندگان دریافت نشد.');const data=await res.json();setItems(data.items);
  }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{if(!controller.signal.aborted)setBusy(false);}},250);
  return()=>{controller.abort();clearTimeout(timeout);};
 },[q,kind]);
 return <div className="space-y-2"><label className="block text-sm">جست‌وجوی {kind==='COURSE'?'دوره':'گیرنده'}<input className={`${field} mt-2`} placeholder="نام را وارد کنید" value={q} maxLength={100} onChange={e=>{setQ(e.target.value);setSelected('');onChange('');}}/></label><label className="block text-sm">انتخاب از نتایج<select className={`${field} mt-2`} required value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);onChange(e.target.value);}}><option value="">{busy?'در حال دریافت…':'انتخاب کنید'}</option>{items.map(item=><option key={item.id} value={item.id}>{item.label}{item.role?` · ${{ADMIN:'مدیر',TEACHER:'مدرس',STUDENT:'دانش‌آموز'}[item.role as 'ADMIN']}`:''}</option>)}</select></label><p className="text-xs leading-6 text-slate-500">حداکثر ۳۰ نتیجه نمایش داده می‌شود؛ برای یافتن فرد یا دورهٔ دیگر نام را جست‌وجو کنید.</p>{error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}</div>;
}
function SubmitButton({busy,label}:{busy:boolean;label:string}){return <button disabled={busy} className="panel-action panel-action-primary disabled:cursor-wait disabled:opacity-60">{busy?<><Spinner small/>در حال ثبت…</>:label}</button>;}
export function NewTicketForm({role}:{role:string}){
 const router=useRouter();const [target,setTarget]=useState(role==='ADMIN'?'USER':'ADMIN');const [recipientId,setRecipient]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const requestId=useRef('');const inFlight=useRef(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');const form=new FormData(e.currentTarget);try{
  requestId.current ||= crypto.randomUUID();const data=await send('/api/tickets',{subject:form.get('subject'),body:form.get('body'),recipientId:target==='ADMIN'?null:recipientId,requestId:requestId.current},'POST',(form.get('file') as File)?.name?form.get('file') as File:undefined);router.push(`/tickets/${data.id}`);router.refresh();
 }catch(e){setError((e as Error).message);}finally{inFlight.current=false;setBusy(false);}}
 return <form onSubmit={submit} className="space-y-5"><h2 className="text-lg font-bold">تیکت جدید</h2><p className="text-sm leading-7 text-slate-500">پیام برای گیرنده و مدیران قابل مشاهده است. اطلاعات ورود یا رمز بانکی را در پیام ننویسید.</p>{role!=='ADMIN'&&<label className="block text-sm">ارسال به<select className={`${field} mt-2`} value={target} onChange={e=>{setTarget(e.target.value);setRecipient('');}}><option value="ADMIN">پشتیبانی مدیریت</option><option value="USER">{role==='TEACHER'?'دانش‌آموز دوره‌های من':'مدرس مشخص'}</option></select></label>}{target==='USER'&&<ContactPicker onChange={setRecipient}/>}<label className="block text-sm">موضوع<input required minLength={3} maxLength={150} name="subject" className={`${field} mt-2`}/></label><label className="block text-sm">متن پیام<textarea required minLength={3} maxLength={6000} name="body" rows={5} className={`${field} mt-2`}/></label>{error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}<TicketFileInput/><SubmitButton busy={busy} label="ثبت و ارسال تیکت"/></form>;
}
export function TicketReply({ticketId,status}:{ticketId:string;status:string}){
 const router=useRouter();const [file,setFile]=useState<File|undefined>();const [fileKey,setFileKey]=useState(0);const [body,setBody]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const requestId=useRef('');const inFlight=useRef(false);
 async function action(reply:boolean){if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');try{
  if(reply){requestId.current ||= crypto.randomUUID();await send(`/api/tickets/${ticketId}/reply`,{body,requestId:requestId.current},'POST',file);setBody('');setFile(undefined);setFileKey(k=>k+1);requestId.current='';router.replace(`/tickets/${ticketId}`);}
  else await send(`/api/tickets/${ticketId}`,{status:status==='OPEN'?'CLOSED':'OPEN'},'PATCH');
  router.refresh();
 }catch(e){setError((e as Error).message);}finally{inFlight.current=false;setBusy(false);}}
 return <div className="space-y-4">{status==='OPEN'?<form onSubmit={e=>{e.preventDefault();void action(true);}} className="space-y-4"><label className="block font-medium">پاسخ شما<textarea required maxLength={6000} rows={5} value={body} onChange={e=>setBody(e.target.value)} className={`${field} mt-2`}/></label><TicketFileInput key={fileKey} onChange={setFile}/><SubmitButton busy={busy} label="ارسال پاسخ"/></form>:<p className="rounded-xl bg-slate-100 p-4 text-sm">تیکت بسته است. برای ادامهٔ گفت‌وگو آن را بازگشایی کنید.</p>}<button type="button" disabled={busy} onClick={()=>void action(false)} className="panel-action panel-action-slate">{status==='OPEN'?'بستن تیکت':'بازگشایی تیکت'}</button>{error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}</div>;
}
export function AnnouncementForm(){
 const router=useRouter();const [audience,setAudience]=useState('STUDENT');const [targetId,setTarget]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const requestId=useRef('');const inFlight=useRef(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(inFlight.current)return;inFlight.current=true;const form=e.currentTarget;const data=new FormData(form);setBusy(true);setMessage('');try{
  requestId.current ||= crypto.randomUUID();const result=await send('/api/admin/notifications',{title:data.get('title'),body:data.get('body'),audience,targetId,requestId:requestId.current});setMessage(`اعلان برای ${result.count.toLocaleString('fa-IR')} کاربر ثبت شد.`);requestId.current='';form.reset();router.refresh();
 }catch(e){setMessage((e as Error).message);}finally{inFlight.current=false;setBusy(false);}}
 return <form onSubmit={submit} className="space-y-5"><label className="block text-sm">مخاطبان<select className={`${field} mt-2`} value={audience} onChange={e=>{setAudience(e.target.value);setTarget('');}}>{[['STUDENT','همهٔ دانش‌آموزان'],['TEACHER','همهٔ مدرس‌ها'],['ALL','همهٔ کاربران'],['COURSE','ثبت‌نام‌شدگان یک دوره'],['USER','یک کاربر مشخص']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{['COURSE','USER'].includes(audience)&&<ContactPicker key={audience} kind={audience} onChange={setTarget}/>}<label className="block text-sm">عنوان<input name="title" required minLength={3} maxLength={150} className={`${field} mt-2`}/></label><label className="block text-sm">متن اعلان<textarea name="body" required minLength={3} maxLength={3000} rows={4} className={`${field} mt-2`}/></label><p className="text-sm leading-7 text-slate-500">با ارسال، اعلان در حساب مخاطبان انتخاب‌شده قرار می‌گیرد. حساب‌های آزمایشی در ارسال گروهی وارد نمی‌شوند.</p><SubmitButton busy={busy} label="ارسال اعلان به مخاطبان انتخاب‌شده"/>{message&&<p role="status" className="text-sm leading-7">{message}</p>}</form>;
}

function TicketFileInput({onChange}:{onChange?:(file:File|undefined)=>void}){return <label className="block rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-sm">پیوست فایل (اختیاری)<input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.zip" className="mt-3 block w-full min-w-0 text-xs file:me-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:text-indigo-700" onChange={e=>onChange?.(e.target.files?.[0])}/><span className="mt-2 block text-xs leading-6 text-slate-500">یک فایل تا ۵ مگابایت؛ PDF، تصویر، متن UTF-8 یا ZIP. فقط طرفین گفت‌وگو و مدیر دسترسی دارند.</span></label>;}
