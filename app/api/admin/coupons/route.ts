import {z} from 'zod';
import {adminRequest} from '@/lib/admin-request';
import {prisma} from '@/lib/prisma';
import {couponCode} from '@/lib/coupons';
export async function POST(request:Request){
 try{await adminRequest(request);}catch{return Response.json({message:'دسترسی ندارید.'},{status:403});}
 try{const input=z.object({code:z.string(),percent:z.number().int().min(1).max(100),active:z.boolean(),courseId:z.string().max(100).nullable()}).parse(await request.json());const code=couponCode(input.code);if(!code)throw Error('کد الزامی است.');
 if(input.courseId&&!await prisma.course.findUnique({where:{id:input.courseId}}))throw Error('دوره پیدا نشد.');
 await prisma.discountCode.upsert({where:{code},create:{...input,code},update:{percent:input.percent,active:input.active,courseId:input.courseId}});
 return Response.json({message:'کد تخفیف ذخیره شد.'});}catch(e){return Response.json({message:e instanceof Error?e.message:'اطلاعات نامعتبر'},{status:400});}
}
