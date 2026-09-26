
import ThemeIcon from '@/components/panel/theme-icon';
import Link from 'next/link';
import type { Prisma, UserRole } from '@prisma/client';
import { requireFinanceUser } from '@/lib/finance';
import { prisma } from '@/lib/prisma';
import { faDigits, latinDigits } from '@/lib/persian-numbers';
const roles={ADMIN:'مدیر',TEACHER:'مدرس',STUDENT:'دانش‌آموز'};
export default async function UsersPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 await requireFinanceUser(true);const query=await searchParams;const q=typeof query.q==='string'?query.q.trim().slice(0,100):'';
 const role=typeof query.role==='string'&&Object.hasOwn(roles,query.role)?query.role as UserRole:undefined;
 const where:Prisma.UserWhereInput={...(role?{role}:{}),...(q?{OR:[{name:{contains:q,mode:'insensitive'}},{email:{contains:q,mode:'insensitive'}},{phone:{contains:latinDigits(q)}}]}:{})};
 const total=await prisma.user.count({where});const pages=Math.max(1,Math.ceil(total/20));const raw=Number(query.page);const page=Number.isSafeInteger(raw)&&raw>0?Math.min(raw,pages):1;
 const users=await prisma.user.findMany({where,orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*20,take:20,select:{id:true,name:true,email:true,phone:true,role:true,demoBatchId:true,_count:{select:{enrollments:true,courses:true}}}});
 const url=(page:number)=>`/admin/users?${new URLSearchParams({q,role:role??'',page:String(page)})}`;
 return <main className="mx-auto max-w-7xl px-4 py-8"><h1 className="text-2xl font-bold">کاربران سایت</h1>
 <form className="my-6 flex flex-wrap gap-3 rounded-2xl border bg-white p-5"><label className="text-sm">جست‌وجوی نام، ایمیل یا موبایل<input name="q" defaultValue={q} className="ms-2 rounded-xl border p-2" /></label><label className="text-sm">سطح دسترسی<select name="role" defaultValue={role??''} className="ms-2 rounded-xl border p-2"><option value="">همه</option>{Object.entries(roles).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>جست‌وجو</button></form>
 <p className="mb-4 text-sm text-slate-500">{faDigits(total)} کاربر</p><div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[700px] text-right text-sm"><thead className="bg-slate-100"><tr>{['نام','دسترسی','موبایل','ایمیل','ثبت‌نام / دوره تدریس','جزئیات'].map(x=><th className="p-4" key={x}>{x}</th>)}</tr></thead><tbody>{users.map(user=><tr key={user.id} className="border-t"><td className="p-4">{user.name||'بدون نام'}{user.demoBatchId&&' (آزمایشی)'}</td><td className="p-4">{roles[user.role]}</td><td className="p-4"><bdi>{faDigits(user.phone??'—')}</bdi></td><td className="p-4"><bdi>{user.email??'—'}</bdi></td><td className="p-4">{faDigits(user._count.enrollments)} / {faDigits(user._count.courses)}</td><td className="p-4"><Link href={`/admin/users/${user.id}`} className="panel-action panel-action-indigo"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>مشاهدهٔ حساب و دوره‌ها</Link></td></tr>)}</tbody></table>{users.length===0&&<p className="p-6">کاربری پیدا نشد.</p>}</div>
 <nav aria-label="صفحه‌بندی کاربران" className="my-5 flex justify-center gap-5 text-sm">{page>1&&<Link href={url(page-1)} className="panel-action panel-action-slate"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>قبل</Link>}<span>{faDigits(page)} از {faDigits(pages)}</span>{page<pages&&<Link href={url(page+1)} className="panel-action panel-action-slate"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>بعد</Link>}</nav></main>;
}
