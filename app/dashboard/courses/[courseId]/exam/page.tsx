import {publicQuestions,displayAnswer} from '@/lib/exam-questions';

import ThemeIcon from '@/components/panel/theme-icon';
import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {assignmentActor} from '@/lib/assignment-api';
import {prisma} from '@/lib/prisma';
import {finishedLessons} from '@/lib/final-assessment';
import {ExamAnswer} from '@/components/assessment/forms';
export default async function ExamPage({params}:{params:Promise<{courseId:string}>}){
 const actor=await assignmentActor();if(!actor)redirect('/login');const {courseId}=await params;
 const e=await prisma.enrollment.findUnique({where:{userId_courseId:{userId:actor.id,courseId}},include:{course:true,examAttempt:{include:{exam:true}}}});
 if(!e||actor.role==='ADMIN'||e.course.teacherId===actor.id)notFound();
 const existing=e.examAttempt;
 const allowed=e.status!=='CANCELLED'&&e.course.status==='PUBLISHED'&&await finishedLessons(prisma,courseId,e.id);
 // Questions are fetched only for eligible learners or their historical attempt.
 const exam=existing?.exam||(allowed?await prisma.finalExam.findFirst({where:{courseId,published:true}}):null);
 return <main className="mx-auto max-w-4xl px-4 py-8"><Link className="panel-action" href={`/dashboard/courses/${courseId}/grades`}><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>بازگشت به کارنامه</Link><section className="assessment-card my-6"><h1 className="mb-5 text-2xl font-bold">آزمون پایانی · {e.course.title}</h1>{existing?<><p className="mb-5 text-teal-800">پاسخ شما ثبت شده است. {existing.score===null?'در انتظار تصحیح مدرس.':`نمره: ${existing.score.toLocaleString('fa-IR')} از ۱۰۰`}</p>{(existing.answers as string[]).map((answer,i)=><div key={i} className="mb-4 rounded-xl border p-4"><h2 className="font-bold">{publicQuestions(existing.exam.questions)[i].prompt}</h2><p className="mt-3 whitespace-pre-wrap leading-8">{displayAnswer(publicQuestions(existing.exam.questions)[i],answer)}</p></div>)}</>:exam?<><h2 className="mb-3 text-xl font-bold">{exam.title}</h2><p className="mb-6 whitespace-pre-wrap text-sm leading-8">{exam.instructions}</p><ExamAnswer courseId={courseId} version={exam.version} questions={publicQuestions(exam.questions)}/></>:<p className="leading-8">آزمون هنوز در دسترس نیست. ثبت‌نام فعال، تکمیل تمام درس‌ها و ویدئوها و انتشار آزمون توسط مدرس لازم است.</p>}</section></main>;
}
