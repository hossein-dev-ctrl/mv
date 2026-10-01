import {couponCode,couponPrice} from "@/lib/coupons";
import {getManagementSession as getSession} from "@/lib/management-session";
import { prisma } from "@/lib/prisma";
import { requestPayment, getPaymentUrl } from "@/lib/zarinpal";

export async function POST(request: Request) {
  try {
    if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({message:"درخواست نامعتبر"},{status:403});
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          message: "ابتدا وارد حساب کاربری شوید.",
        },
        { status: 401 },
      );
    }

    if(session.role==="ADMIN")return Response.json({message:"مدیر امکان خرید دوره ندارد."},{status:403});
    const body = await request.json();

    const courseId = body.courseId;

    if (typeof courseId !== "string" || !courseId) {
      return Response.json(
        {
          message: "شناسه دوره ارسال نشده است.",
        },
        { status: 400 },
      );
    }

    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      return Response.json(
        {
          message: "دوره پیدا نشد.",
        },
        { status: 404 },
      );
    }

    if (course.teacherId === session.userId) {
      return Response.json({ message: "شما مدرس این دوره هستید؛ از بخش مدیریت دوره استفاده کنید." }, { status: 403 });
    }

    if (course.deliveryStatus === "UPCOMING") return Response.json({message:"این دوره فقط پیش‌ثبت‌نام دارد و هنوز قابل خرید نیست."},{status:400});
    if (course.status !== "PUBLISHED") {
      return Response.json(
        {
          message: "این دوره قابل خرید نیست.",
        },
        { status: 400 },
      );
    }

    let code:string,percent:number,payable:number;
    try{code=couponCode(body.code);const coupon=code?await prisma.discountCode.findUnique({where:{code}}):null;const quote=couponPrice(course,coupon,code);payable=quote.amount;percent=quote.percent;}catch(e){return Response.json({message:e instanceof Error?e.message:'کد نامعتبر'},{status:400});}
    if(session.testMode&&payable>0&&process.env.ZARINPAL_SANDBOX!=='true')return Response.json({message:'پرداخت واقعی با حساب آزمایشی مجاز نیست؛ حالت Sandbox را فعال کنید.'},{status:403});
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
    });

    if (existingEnrollment && existingEnrollment.status !== "CANCELLED") {
      return Response.json(
        {
          message: "شما قبلاً در این دوره ثبت‌نام کرده‌اید.",
        },
        { status: 400 },
      );
    }

    if(payable===0){
      await prisma.$transaction(async tx=>{
        await tx.$queryRaw`SELECT id FROM "User" WHERE id=${session.userId} FOR UPDATE`;
        const prior=await tx.enrollment.findUnique({where:{userId_courseId:{userId:session.userId,courseId}}});
        if(prior&&prior.status!=='CANCELLED')return;
        await tx.enrollment.upsert({where:{userId_courseId:{userId:session.userId,courseId}},create:{userId:session.userId,courseId},update:{status:'ACTIVE'}});
        await tx.payment.create({data:{userId:session.userId,courseId,amount:0,status:'SUCCESS',paidAt:new Date(),couponCode:code||null,couponPercent:percent,teacherShareAmount:0,teacherSharePercent:0,isTest:false}});
      });
      return Response.json({paymentUrl:`/courses/${course.slug}`});
    }
    /*
     * اگر پرداخت PENDING قبلی داریم،
     * دوباره Payment نساز.
     */

    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId: session.userId,
        courseId,
        status: "PENDING",
        amount: payable,
        couponCode: code||null,
        isTest: process.env.ZARINPAL_SANDBOX === "true",
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    if(existingPayment?.authority)return Response.json({success:true,paymentId:existingPayment.id,paymentUrl:getPaymentUrl(existingPayment.authority)});

    const payment =
      existingPayment ||
      (await prisma.payment.create({
        data: {
          userId: session.userId,
          courseId,
          isTest: process.env.ZARINPAL_SANDBOX === "true",
          amount: payable,
          couponCode: code||null,
          couponPercent: percent,
          status: "PENDING",
        },
      }));

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
    });

    /*
     * درخواست به زرین‌پال
     */

    const zarinpal = await requestPayment({
      amount: payment.amount,
      description: `خرید دوره ${course.title}`,
      email: user?.email || undefined,
      mobile: user?.phone || undefined,
    });

    const gatewayCode = zarinpal?.data?.code;

    const authority = zarinpal?.data?.authority;

    if (gatewayCode !== 100 && gatewayCode !== 101) {
      console.error("ZARINPAL REQUEST:", zarinpal);

      throw new Error("زرین‌پال درخواست پرداخت را قبول نکرد.");
    }

    if (!authority) {
      throw new Error("Authority از زرین‌پال دریافت نشد.");
    }

    await prisma.payment.update({
      where: {
        id: payment.id,
      },

      data: {
        authority,
      },
    });

    return Response.json({
      success: true,

      paymentId: payment.id,

      paymentUrl: getPaymentUrl(authority),
    });
  } catch (error) {
    console.error("CREATE_PAYMENT_ERROR:", error);

    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "خطا در ایجاد پرداخت.",
      },
      { status: 500 },
    );
  }
}
