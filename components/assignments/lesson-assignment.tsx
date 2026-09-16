import {prisma} from '@/lib/prisma';
import SubmissionCard from './submission-card';
import {SubmissionForm} from './forms';
// This component must only be rendered after the page's lesson-access check.
export default async function LessonAssignment({lessonId,enrollmentId}:{lessonId:string;enrollmentId:string}) {
 const assignment=await prisma.assignment.findUnique({where:{lessonId}});if(!assignment)return null;
 const submissions=await prisma.submission.findMany({where:{assignmentId:assignment.id,enrollmentId},orderBy:{attempt:'desc'}});
 if(!assignment.published&&!submissions.length)return null;
 const latest=submissions[0];
 return <section className="mt-8 rounded-2xl border border-indigo-200 bg-white p-6"><h2 className="text-xl font-bold">تکلیف: {assignment.title}</h2>{assignment.published?<><p className="mt-4 whitespace-pre-wrap leading-8 text-slate-700">{assignment.instructions}</p>{(!latest||latest.status==='REVISION')&&<SubmissionForm key={`${assignment.version}-${latest?.id??'new'}`} lessonId={lessonId} version={assignment.version} previous={latest}/>}</>:<p className="mt-4 text-sm text-amber-800">پذیرش پاسخ این تکلیف فعلاً غیرفعال است؛ سوابق شما حفظ شده‌اند.</p>}{latest?.status==='PENDING'&&<p className="my-4 text-sm text-indigo-700">پاسخ شما ثبت شده و منتظر بررسی مدرس است.</p>}<div className="mt-5 space-y-4">{submissions.map(s=><SubmissionCard key={s.id} submission={s}/>)}</div></section>;
}
