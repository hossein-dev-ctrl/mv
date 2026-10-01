import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getManagementSession} from '@/lib/management-session';
import {prisma} from '@/lib/prisma';
import {certificateValid} from '@/lib/certificates';
export default async function MyCertificates(){
 const actor=await getManagementSession();if(!actor)redirect('/login');if(actor.role==='ADMIN')redirect('/admin/certificates');
 const rows=await prisma.certificate.findMany({where:{enrollment:{userId:actor.userId}},include:{enrollment:{select:{status:true}}},orderBy:{issuedAt:'desc'}});
 return <main className="mx-auto max-w-5xl space-y-6 p-6"><h1 className="text-2xl font-bold">گواهی‌نامه‌های من</h1><p className="text-sm leading-8">پس از قبولی، از کارنامهٔ نهایی هر دوره گواهی دریافت کنید. شناسه و QR امکان استعلام نام دارنده، دوره و نمره را فراهم می‌کنند؛ فقط با افرادی که می‌خواهید مدرک را ببینند به اشتراک بگذارید.</p><div className="grid gap-5 md:grid-cols-2">{rows.map(c=><article className="assessment-card" key={c.id}><h2 className="assessment-heading">{c.courseTitle}</h2><p className="my-4 text-sm">{certificateValid(c)?'معتبر':'نامعتبر'} · نمرهٔ {c.score.toLocaleString('fa-IR')}</p><Link className="panel-action panel-action-primary" href={`/certificates/${c.id}`}>مشاهده و چاپ گواهی</Link></article>)}</div>{!rows.length&&<p className="assessment-card">هنوز گواهی صادر نشده است.</p>}<Link className="panel-action" href="/dashboard">بازگشت به دوره‌های من</Link></main>;
}
