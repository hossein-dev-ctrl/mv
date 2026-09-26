import Link from 'next/link';
import {prisma} from '@/lib/prisma';
import {assignmentActor} from '@/lib/assignment-api';
import {finishedLessons} from '@/lib/final-assessment';
import ThemeIcon from '@/components/panel/theme-icon';
export default async function ExamGateway({courseId}:{courseId:string}){
 const actor=await assignmentActor();if(!actor||actor.role==='ADMIN')return null;
 const e=await prisma.enrollment.findUnique({where:{userId_courseId:{userId:actor.id,courseId}},include:{course:{select:{teacherId:true,status:true}},examAttempt:{select:{id:true}}}});
 if(!e||e.status==='CANCELLED'||e.course.teacherId===actor.id||e.course.status!=='PUBLISHED')return null;
 const complete=await finishedLessons(prisma,courseId,e.id);const exam=await prisma.finalExam.findUnique({where:{courseId},select:{published:true}});
 return <div className="my-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4"><div className="panel-actions"><Link className="panel-action" href={`/dashboard/courses/${courseId}/grades`}><ThemeIcon name="award" className="h-5 w-5"/>کارنامه و بازخوردها</Link>{complete&&exam?.published&&<Link className="panel-action panel-action-primary" href={`/dashboard/courses/${courseId}/exam`}><ThemeIcon name="file" className="h-5 w-5"/>{e.examAttempt?'مشاهدهٔ پاسخ آزمون':'شروع آزمون پایانی'}</Link>}</div><p className="mt-3 text-xs leading-7 text-slate-600">{!complete?'آزمون پایانی پس از تکمیل همهٔ درس‌ها و ویدئوها باز می‌شود.':!exam?.published?'درس‌ها تکمیل شده‌اند؛ آزمون هنوز توسط مدرس منتشر نشده است.':'درس‌ها تکمیل شده‌اند؛ می‌توانید آزمون و فرم نظر دوره در کارنامه را باز کنید.'}</p></div>;
}
