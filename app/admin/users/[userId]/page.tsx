
import ThemeIcon from '@/components/panel/theme-icon';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireFinanceUser } from '@/lib/finance';
import { faDigits } from '@/lib/persian-numbers';
export default async function UserPage({params}:{params:Promise<{userId:string}>}) {
 await requireFinanceUser(true);const {userId}=await params;
 const user=await prisma.user.findUnique({where:{id:userId},select:{id:true,name:true,email:true,phone:true,role:true,createdAt:true,demoBatchId:true,courses:{select:{id:true,title:true,status:true}},enrollments:{select:{id:true,status:true,course:{select:{id:true,title:true}}}}}});
 if(!user)notFound();
 const labels={ADMIN:'مدیر',TEACHER:'مدرس',STUDENT:'دانش‌آموز'};
 return <main className="mx-auto max-w-5xl px-4 py-8"><Link href="/admin/users" className="panel-action panel-action-indigo"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>بازگشت به کاربران</Link><h1 className="my-5 text-2xl font-bold">{user.name||'کاربر بدون نام'}{user.demoBatchId&&' — حساب آزمایشی'}</h1>
 <dl className="grid gap-4 rounded-2xl border bg-white p-6 sm:grid-cols-3"><div><dt>سطح دسترسی</dt><dd className="mt-2 font-bold">{labels[user.role]}</dd></div><div><dt>شماره موبایل</dt><dd className="mt-2"><bdi>{faDigits(user.phone??'—')}</bdi></dd></div><div><dt>ایمیل</dt><dd className="mt-2 break-all"><bdi>{user.email??'—'}</bdi></dd></div></dl>
 <section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="mb-4 font-bold">دوره‌های ثبت‌نام‌شده</h2><ul className="space-y-3">{user.enrollments.map(e=><li key={e.id}><Link href={`/teacher/courses/${e.course.id}/students/${e.id}`} className="panel-action panel-action-teal">{e.course.title}</Link> · {{ACTIVE:'فعال',COMPLETED:'تکمیل‌شده',CANCELLED:'لغوشده'}[e.status]}</li>)}</ul>{!user.enrollments.length&&<p>ثبت‌نامی ندارد.</p>}</section>
 <section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="mb-4 font-bold">دوره‌های تدریس این حساب</h2><ul className="space-y-3">{user.courses.map(c=><li key={c.id}><Link href={`/teacher/courses/${c.id}`} className="panel-action panel-action-indigo">{c.title}</Link> · {{DRAFT:'پیش‌نویس',PUBLISHED:'منتشرشده',ARCHIVED:'آرشیوشده'}[c.status]}</li>)}</ul>{!user.courses.length&&<p>دوره‌ای برای تدریس ندارد.</p>}</section></main>;
}
