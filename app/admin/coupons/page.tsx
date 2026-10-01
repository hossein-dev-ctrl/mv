import {redirect} from 'next/navigation';
import {getManagementSession} from '@/lib/management-session';
import {prisma} from '@/lib/prisma';
import {CouponForm} from '@/components/communication/admin-tools';
export default async function Coupons(){
 if((await getManagementSession())?.role!=='ADMIN')redirect('/login');
 const [courses,codes]=await Promise.all([prisma.course.findMany({where:{demoBatchId:null},select:{id:true,title:true},orderBy:{title:'asc'}}),prisma.discountCode.findMany({orderBy:{createdAt:'desc'}})]);
 return <main className="mx-auto max-w-6xl space-y-6 p-6"><h1 className="text-2xl font-bold">کدهای تخفیف</h1><div className="grid items-start gap-6 md:grid-cols-2"><section className="assessment-card"><h2 className="assessment-heading mb-5">ایجاد یا ویرایش کد</h2><CouponForm courses={courses}/></section><section className="assessment-card space-y-3"><h2 className="assessment-heading">کدهای ثبت‌شده</h2>{codes.map(c=><article className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4" key={c.code}><bdi className="font-bold">{c.code}</bdi><p className="mt-2 text-sm leading-7">{c.percent.toLocaleString('fa-IR')}٪ · {c.active?'فعال':'غیرفعال'} · {c.courseId?courses.find(x=>x.id===c.courseId)?.title||'دوره حذف شده':'همهٔ دوره‌ها'}</p></article>)}{!codes.length&&<p>هنوز کدی ثبت نشده است.</p>}</section></div></main>;
}
