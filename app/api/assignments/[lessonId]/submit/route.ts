import {submissionInput,submitAssignment} from '@/lib/assignments';
import {assignmentActor,assignmentError} from '@/lib/assignment-api';
export async function POST(request:Request,{params}:{params:Promise<{lessonId:string}>}){
 const actor=await assignmentActor();if(!actor)return Response.json({message:'دوباره وارد حساب شوید.'},{status:401});
 const input=submissionInput.safeParse(await request.json().catch(()=>null));if(!input.success)return Response.json({message:input.error.issues[0]?.message||'اطلاعات نامعتبر است.'},{status:400});
 try{await submitAssignment(actor,(await params).lessonId,input.data);return Response.json({message:'پاسخ ثبت شد و منتظر بررسی مدرس است.'});}catch(error){return assignmentError(error);}
}
