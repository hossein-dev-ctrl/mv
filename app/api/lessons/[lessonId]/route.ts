import {getSession} from '@/lib/auth';
import {getLessonAccess} from '@/lib/lesson-access';
export async function GET(_request:Request,{params}:{params:Promise<{lessonId:string}>}) {
 const session=await getSession();if(!session)return Response.json({message:'ابتدا وارد حساب شوید.'},{status:401});
 const {lessonId}=await params;const access=await getLessonAccess(session.userId,lessonId);
 if(!access.allowed)return Response.json({message:'این درس برای شما قابل دسترسی نیست.'},{status:access.reason==='LESSON_NOT_FOUND'?404:403});
 const lesson=access.lesson!;
 return Response.json({success:true,lesson:{id:lesson.id,title:lesson.title,description:lesson.description,videoUrl:lesson.videoUrl,videoDuration:lesson.videoDuration,files:lesson.files},progress:access.enrollment!.progresses.find(p=>p.lessonId===lessonId)??null});
}
