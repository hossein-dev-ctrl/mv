import {prisma} from '@/lib/prisma';
import ThemeIcon from '@/components/panel/theme-icon';
export default async function ContentSummary({courseId,management=false}:{courseId:string;management?:boolean}){
 const lessons=await prisma.lesson.findMany({where:{section:{courseId},...(management?{}:{status:'PUBLISHED' as const})},select:{videoDuration:true,videoUrl:true,files:{select:{name:true,type:true}}}});
 const exam=await prisma.finalExam.findUnique({where:{courseId},select:{questions:true,published:true}});
 const seconds=lessons.reduce((n,l)=>n+(l.videoUrl?l.videoDuration??0:0),0);
 const files=lessons.flatMap(l=>l.files);const pdf=files.filter(f=>f.type==='application/pdf'||/\.pdf$/i.test(f.name)).length;
 const project=files.filter(f=>/\.(zip|rar|7z|py|js|ts|sb3|ipynb|java|cpp|html)$/i.test(f.name)).length;
 const questions=exam&&(management||exam.published)&&Array.isArray(exam.questions)?exam.questions.length:0;
 const rows=[{icon:'play' as const,text:`${(seconds/3600).toLocaleString('fa-IR',{maximumFractionDigits:1})} ساعت آموزش ویدئویی`},{icon:'exam' as const,text:`${questions.toLocaleString('fa-IR')} سؤال آزمون پایانی`},{icon:'folder' as const,text:`${project.toLocaleString('fa-IR')} فایل برنامه و پروژه`},{icon:'file' as const,text:`${pdf.toLocaleString('fa-IR')} فایل PDF و جزوه`},{icon:'message' as const,text:'پرسش و پاسخ از طریق تیکت'},{icon:'award' as const,text:exam?.published?'آزمون پایانی منتشرشده':'آزمون پایانی در انتظار انتشار'}];
 return <section className="assessment-card my-6"><h2 className="assessment-heading"><ThemeIcon name="layers"/>محتوای آموزش</h2><ul className="content-summary-grid">{rows.map(r=><li key={r.text}><ThemeIcon name={r.icon}/><span>{r.text}</span></li>)}</ul><p className="text-xs leading-7 text-slate-500">{management?'شامل پیش‌نویس‌ها؛ نمای عمومی فقط محتوای منتشرشده را می‌شمارد.':'بر اساس محتوای منتشرشده.'} زمان‌ها بر اساس مدت ثبت‌شدهٔ ویدئو هستند.</p></section>;
}
export function CertificateInfo(){return <section className="assessment-card certificate-info my-6"><h2 className="assessment-heading"><ThemeIcon name="award"/>گواهی‌نامه پایان دوره</h2><p className="mt-4 leading-8">با کسب نمره قبولی در آزمون‌ها، گواهینامه رسمی پایان دوره به دو زبان <strong>فارسی</strong> و <strong>انگلیسی</strong> به شما اعطا می‌شود که قابل استعلام در سایت می‌باشد.</p><p className="mt-3 text-xs leading-7 text-indigo-700">صدور گواهی و استعلام با QR در مرحلهٔ بعد فعال می‌شود؛ در حال حاضر گواهی صادر نمی‌شود.</p></section>;}
