import Link from 'next/link';
import {redirect} from 'next/navigation';
import {prisma} from '@/lib/prisma';
import {getManagementSession} from '@/lib/management-session';
import {certificateDesign,styleLabels} from '@/lib/certificate-templates';
import {TemplateEditor,AssignCertificateTemplate} from '@/components/assessment/template-editor';
export default async function Templates({searchParams}:{searchParams:Promise<{edit?:string}>}){
 if((await getManagementSession())?.role!=='ADMIN')redirect('/login');
 const {edit}=await searchParams;const [templates,courses]=await Promise.all([prisma.certificateTemplate.findMany({orderBy:{createdAt:'desc'}}),prisma.course.findMany({where:{demoBatchId:null},select:{id:true,title:true,certificateTemplateId:true},orderBy:{title:'asc'}})]);const current=templates.find(t=>t.id===edit);
 return <main className="mx-auto max-w-7xl space-y-7 p-6"><header><Link className="panel-action" href="/admin/certificates">بازگشت به مرکز مدارک</Link><h1 className="my-4 text-2xl font-bold">قالب‌های گواهی‌نامه</h1><p className="text-sm leading-8">قالب‌های مختلف بسازید، پیش‌نمایش را ببینید و برای هر دوره انتخاب کنید. طراحی هنگام صدور در مدرک ذخیره می‌شود؛ تغییر یا غیرفعال‌کردن قالب، مدرک‌های قبلی را تغییر نمی‌دهد.</p></header><nav className="flex flex-wrap gap-3"><Link href="/admin/certificates/templates" className="panel-action">＋ قالب جدید</Link>{templates.map(t=><Link scroll={false} href={`?edit=${t.id}`} className={`panel-action ${current?.id===t.id?'panel-action-primary':''}`} key={t.id}>{t.name} · {styleLabels[certificateDesign(t).style]}{!t.active?' · غیرفعال':''}</Link>)}</nav><TemplateEditor key={current?.id||'new'} initial={current?{id:current.id,...certificateDesign(current)}:undefined} previewDate={new Date().toISOString()}/><section className="assessment-card"><h2 className="assessment-heading mb-5">انتخاب قالب برای هر دوره</h2><AssignCertificateTemplate courses={courses} templates={templates.filter(t=>t.active).map(t=>({id:t.id,name:t.name}))}/></section></main>;
}
