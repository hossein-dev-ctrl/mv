import {saveExam,examInput} from '@/lib/final-assessment';
import {assignmentActor,assignmentError} from '@/lib/assignment-api';
export async function PUT(request:Request,{params}:{params:Promise<{courseId:string}>}){
 const actor=await assignmentActor();if(!actor)return Response.json({message:'دوباره وارد حساب شوید.'},{status:401});
 const input=examInput.safeParse(await request.json().catch(()=>null));if(!input.success)return Response.json({message:'اطلاعات فرم ناقص یا نامعتبر است؛ همهٔ فیلدها و محدودهٔ نمره را بررسی کنید.'},{status:400});
 try{await saveExam(actor,(await params).courseId,input.data);return Response.json({message:'ذخیره شد.'});}catch(error){return assignmentError(error);}
}
