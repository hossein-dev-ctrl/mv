import {getManagementSession} from '@/lib/management-session';
export async function adminRequest(request:Request){
 const actor=await getManagementSession();
 if(actor?.role!=='ADMIN')throw Error('دسترسی فقط برای مدیر است.');
 if(request.headers.get('origin')!==new URL(request.url).origin)throw Error('درخواست نامعتبر است.');
 return actor;
}
