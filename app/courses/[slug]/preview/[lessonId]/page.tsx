import {notFound} from 'next/navigation';
import Link from 'next/link';
import {prisma} from '@/lib/prisma';
import ThemeIcon from '@/components/panel/theme-icon';
export const dynamic='force-dynamic';
export default async function Preview({params}:{params:Promise<{slug:string;lessonId:string}>}){
 const {slug,lessonId}=await params;
 const lesson=await prisma.lesson.findFirst({where:{id:lessonId,isPreview:true,status:'PUBLISHED',section:{course:{slug,status:'PUBLISHED'}}},select:{title:true,description:true,videoUrl:true,section:{select:{course:{select:{title:true}}}}}});
 if(!lesson)notFound();
 return <main className="mx-auto max-w-5xl px-4 py-8"><Link className="panel-action" href={`/courses/${slug}`}><ThemeIcon name="arrow"/>بازگشت به دوره</Link><header className="learner-hero my-6"><div><p>دموی رایگان · {lesson.section.course.title}</p><h1>{lesson.title}</h1></div><ThemeIcon name="play" className="h-12 w-12"/></header><section className="assessment-card">{lesson.videoUrl?<video controls preload="metadata" className="aspect-video w-full rounded-2xl bg-slate-950" src={lesson.videoUrl}/>:<p>ویدئویی برای این درس ثبت نشده است.</p>}<p className="mt-6 whitespace-pre-wrap leading-8">{lesson.description}</p><p className="mt-6 rounded-xl bg-indigo-50 p-4 text-sm leading-7">این نمایش رایگان است و در پیشرفت دوره ثبت نمی‌شود. برای تمرین‌ها و محتوای کامل، در دوره ثبت‌نام کنید.</p></section></main>;
}
