import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getManagementSession} from '@/lib/management-session';
import {prisma} from '@/lib/prisma';
import {RevokeCertificate} from '@/components/assessment/certificate-actions';
export default async function Certificates({searchParams}:{searchParams:Promise<{page?:string}>}){
 if((await getManagementSession())?.role!=='ADMIN')redirect('/login');
 const query=await searchParams;const page=Math.floor(Math.max(1,Math.min(10000,Number(query.page)||1)));
 const rows=await prisma.certificate.findMany({orderBy:{issuedAt:'desc'},skip:(page-1)*30,take:31,include:{enrollment:{select:{status:true}}}});
 return <main className="mx-auto max-w-6xl space-y-6 p-6"><h1 className="text-2xl font-bold">گواهی‌نامه‌های صادرشده</h1><p className="text-sm leading-8">صدور از کارنامهٔ نهایی دانش‌آموز انجام می‌شود. گواهی تصویر ثابت نمره و نام در زمان صدور است. ابطال توسط مدیر یا لغو ثبت‌نام، استعلام را نامعتبر می‌کند.</p><section className="assessment-card space-y-4">{rows.slice(0,30).map(c=><article key={c.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"><div><h2 className="font-bold">{c.studentName} · {c.courseTitle}</h2><p className="mt-2 text-sm">نمره: {c.score.toLocaleString('fa-IR')} · {c.revokedAt||c.enrollment.status==='CANCELLED'?'نامعتبر':'معتبر'}</p></div><div className="flex flex-wrap gap-3"><Link className="panel-action" href={`/certificates/${c.id}`}>مشاهده و استعلام</Link>{!c.revokedAt&&<RevokeCertificate id={c.id}/>}</div></article>)}{!rows.length&&<p>هنوز گواهی صادر نشده است.</p>}</section><nav className="flex gap-3">{page>1&&<Link className="panel-action" href={`?page=${page-1}`}>قبل</Link>}{rows.length>30&&<Link className="panel-action" href={`?page=${page+1}`}>بعد</Link>}</nav></main>;
}
