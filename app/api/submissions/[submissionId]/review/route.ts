import {reviewInput,reviewSubmission} from '@/lib/assignments';
import {assignmentActor,assignmentError} from '@/lib/assignment-api';
export async function POST(request:Request,{params}:{params:Promise<{submissionId:string}>}){
 const actor=await assignmentActor();if(!actor)return Response.json({message:'دوباره وارد حساب شوید.'},{status:401});
 const input=reviewInput.safeParse(await request.json().catch(()=>null));if(!input.success)return Response.json({message:input.error.issues[0]?.message||'اطلاعات نامعتبر است.'},{status:400});
 try{await reviewSubmission(actor,(await params).submissionId,input.data);return Response.json({message:'ارزیابی ثبت شد.'});}catch(error){return assignmentError(error);}
}
