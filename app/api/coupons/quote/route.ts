import {getManagementSession} from '@/lib/management-session';
import {prisma} from '@/lib/prisma';
import {couponCode,couponPrice} from '@/lib/coupons';
export async function POST(request:Request){
 if(!await getManagementSession())return Response.json({message:'ابتدا وارد شوید.'},{status:401});
 try{const body=await request.json();const code=couponCode(body.code);const course=await prisma.course.findFirst({where:{id:String(body.courseId),status:'PUBLISHED',deliveryStatus:{not:'UPCOMING'}}});if(!course)throw Error('دوره قابل خرید نیست.');const coupon=code?await prisma.discountCode.findUnique({where:{code}}):null;return Response.json(couponPrice(course,coupon,code));}catch(e){return Response.json({message:e instanceof Error?e.message:'کد نامعتبر'},{status:400});}
}
