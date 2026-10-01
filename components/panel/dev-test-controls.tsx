"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import ThemeIcon from '@/components/panel/theme-icon';
export function TestAccountAction({action,userId,label}:{action:'create'|'switch'|'restore';userId?:string;label:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const router=useRouter();
 return <div><button disabled={busy} className="panel-action" onClick={async()=>{setBusy(true);try{const res=await fetch('/api/dev/test-users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,userId})});const data=await res.json();if(!res.ok)throw Error(data.message);if(data.redirect)window.location.assign(data.redirect);else{setMessage(data.message);router.refresh();}}catch(e){setMessage(e instanceof Error?e.message:'خطا');}finally{setBusy(false);}}}><ThemeIcon name={action==='restore'?'arrow':'users'} className="h-4 w-4"/><span>{busy?'در حال اجرا…':label}</span></button><p role="status" className="mt-2 text-xs leading-6">{message}</p></div>;
}
