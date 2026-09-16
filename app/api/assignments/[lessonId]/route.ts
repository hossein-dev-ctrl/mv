import {assignmentInput,saveAssignment} from '@/lib/assignments';
import {assignmentActor,assignmentError} from '@/lib/assignment-api';
export async function PUT(request:Request,{params}:{params:Promise<{lessonId:string}>}){
 const actor=await assignmentActor();if(!actor)return Response.json({message:'دوباره وارد حساب شوید.'},{status:401});
 const input=assignmentInput.safeParse(await request.json().catch(()=>null));if(!input.success)return Response.json({message:input.error.issues[0]?.message||'اطلاعات نامعتبر است.'},{status:400});
 try{await saveAssignment(actor,(await params).lessonId,input.data);return Response.json({message:'تکلیف ذخیره شد.'});}catch(error){return assignmentError(error);}
}
