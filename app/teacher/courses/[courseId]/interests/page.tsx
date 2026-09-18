import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {prisma} from '@/lib/prisma';
import {getSession} from '@/lib/auth';
import {faDigits} from '@/lib/persian-numbers';
export default async function InterestsPage({params,searchParams}:{params:Promise<{courseId:string}>;searchParams:Promise<{page?:string}>}) {
 const session=await getSession();if(!session)redirect('/login');
 const user=await prisma.user.findUnique({where:{id:session.userId},select:{role:true}});
 if(!user||user.role!==session.role||!['ADMIN','TEACHER'].includes(user.role))redirect('/dashboard');
 const {courseId}=await params;const course=await prisma.course.findUnique({where:{id:courseId},select:{teacherId:true,title:true}});
 if(!course||(user.role!=='ADMIN'&&course.teacherId!==session.userId))notFound();
 const count=await prisma.courseInterest.count({where:{courseId}});const pages=Math.max(1,Math.ceil(count/30));const raw=Number((await searchParams).page);const page=Number.isSafeInteger(raw)&&raw>0?Math.min(raw,pages):1;
 const rows=await prisma.courseInterest.findMany({where:{courseId},orderBy:[{createdAt:'desc'},{id:'asc'}],take:30,skip:(page-1)*30});
 return <main className="mx-auto max-w-6xl px-4 py-8"><Link href={`/teacher/courses/${courseId}`} className="panel-action panel-action-indigo">بازگشت به دوره</Link><h1 className="my-5 text-2xl font-bold">متقاضیان {course.title}</h1><p className="mb-5 text-sm leading-8">{faDigits(count)} درخواست؛ این افراد با اطلاع‌رسانی شروع دوره موافقت کرده‌اند. شماره‌ها خوداظهاری هستند. در این مرحله پیامکی ارسال نمی‌شود و این فهرست برای پیگیری بعدی نگه‌داری می‌شود.</p><div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-right text-sm"><thead className="bg-slate-100"><tr><th className="p-4">نام</th><th>موبایل</th><th>زمان درخواست</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t"><td className="p-4">{row.name}</td><td><bdi>{faDigits(row.phone)}</bdi></td><td>{row.createdAt.toLocaleDateString('fa-IR',{timeZone:'Asia/Tehran'})}</td></tr>)}</tbody></table>{!rows.length&&<p className="p-5">هنوز درخواستی ثبت نشده است.</p>}</div><nav className="mt-5 flex gap-4">{page>1&&<Link scroll={false} href={`?page=${page-1}`} className="panel-action panel-action-slate">قبل</Link>}<span>{faDigits(page)} از {faDigits(pages)}</span>{page<pages&&<Link scroll={false} href={`?page=${page+1}`} className="panel-action panel-action-slate">بعد</Link>}</nav></main>;
}
