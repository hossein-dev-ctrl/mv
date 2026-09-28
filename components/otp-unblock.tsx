'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function Unblock({phone}:{phone:string}){const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const router=useRouter();return <div><button className="panel-action" disabled={busy} onClick={async()=>{if(!confirm('پس از احراز هویت صاحب شماره، مسدودی رفع شود؟'))return;setBusy(true);try{const res=await fetch('/api/admin/login-blocks',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});const data=await res.json();if(!res.ok)throw Error(data.message);router.refresh();}catch(e){setMessage(e instanceof Error?e.message:'خطا');}finally{setBusy(false);}}}>رفع مسدودی</button><p role="status">{message}</p></div>;}
