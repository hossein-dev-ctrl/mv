import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readWallet } from "@/lib/wallet";
import { validIban } from "@/lib/wallet-math";
import {notifyAdmins,notifyUsers} from '@/lib/notifications';

const money=z.number().int().min(0).max(2000000000);
const ref=z.string().trim().min(3).max(100);
const date=z.string().datetime().refine(value=>new Date(value).getTime()<=Date.now()+60000,"تاریخ آینده مجاز نیست.");
export const settlementInput=z.discriminatedUnion("action",[
  z.object({action:z.literal("settings"),minimum:money.positive()}),
  z.object({action:z.literal("request"),amount:money.positive(),iban:z.string().trim().toUpperCase().refine(validIban,"شماره شبا نامعتبر است."),accountName:z.string().trim().min(3).max(100)}),
  z.object({action:z.literal("begin"),id:z.string().min(1)}),
  z.object({action:z.literal("pay"),id:z.string().min(1),fee:money,reference:ref,paidAt:date}),
  z.object({action:z.literal("reject"),id:z.string().min(1),reason:z.string().trim().min(3).max(500)}),
  z.object({action:z.literal("dispute"),id:z.string().min(1),reason:z.string().trim().min(3).max(500)}),
  z.object({action:z.literal("review"),id:z.string().min(1),reason:z.string().trim().min(3).max(500)}),
  z.object({action:z.literal("reverse"),id:z.string().min(1),reason:z.string().trim().min(3).max(500)}),
  z.object({action:z.literal("receive"),id:z.string().min(1)}),
  z.object({action:z.literal("refund"),paymentId:z.string().min(1),reference:ref,reason:z.string().trim().min(3).max(500),refundedAt:date}),
  z.object({action:z.literal("cost"),paymentId:z.string().min(1),amount:money}),
]);
type Actor={id:string;role:string};
export async function executeSettlement(actor:Actor,input:z.infer<typeof settlementInput>) {
  const teacherAction=input.action==="request"||input.action==="receive"||input.action==="dispute";
  if(actor.role!==(teacherAction?"TEACHER":"ADMIN")) throw new Error("این عملیات برای نقش شما مجاز نیست.");
  return prisma.$transaction(async tx=>{
    if(input.action==="settings") {
      await tx.financeSettings.upsert({where:{id:"main"},create:{id:"main",minimumPayout:input.minimum},update:{minimumPayout:input.minimum}});
      return "حداقل برداشت ذخیره شد.";
    }
    // All balance-decreasing operations serialize on the same teacher row.
    let teacherId=actor.id;
    if(input.action==="begin"||input.action==="pay"||input.action==="reject"||input.action==="receive"||input.action==="dispute"||input.action==="review"||input.action==="reverse") {
      const target=await tx.payout.findUnique({where:{id:input.id}});
      if(!target || (["receive","dispute"].includes(input.action) && target.teacherId!==actor.id)) throw new Error("درخواست پیدا نشد.");
      teacherId=target.teacherId;
    }
    if(input.action==="refund"||input.action==="cost") {
      const target=await tx.payment.findUnique({where:{id:input.paymentId},select:{course:{select:{teacherId:true}}}});
      if(!target)throw new Error("پرداخت پیدا نشد.");
      teacherId=target.course.teacherId;
    }
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${teacherId} FOR UPDATE`;
    if(process.env.NODE_ENV === "production") {
      const teacher=await tx.user.findUnique({where:{id:teacherId},select:{demoBatchId:true}});
      if(teacher?.demoBatchId)throw new Error("دادهٔ آزمایشی در این محیط قابل استفاده نیست.");
    }
    if(input.action==="request") {
      const settings=await tx.financeSettings.findUnique({where:{id:"main"}});
      if(!settings?.minimumPayout)throw new Error("مدیر هنوز حداقل برداشت را تعیین نکرده است.");
      const wallet=await readWallet(actor.id,tx);
      if(wallet.payouts.some(p=>["REQUESTED","PROCESSING"].includes(p.status)))throw new Error("یک درخواست باز دارید؛ ابتدا نتیجهٔ آن مشخص شود.");
      if(input.amount<settings.minimumPayout || input.amount>wallet.totals.available)throw new Error("مبلغ باید حداقل برداشت را داشته باشد و از مانده بیشتر نباشد.");
      const created=await tx.payout.create({data:{teacherId:actor.id,amount:input.amount,iban:input.iban,accountName:input.accountName}});
      await notifyAdmins(tx,{title:'درخواست برداشت جدید',body:'یک مدرس درخواست برداشت ثبت کرده است؛ جزئیات را در بخش تسویه بررسی کنید.',href:'/admin/settlements',eventKey:`payout:${created.id}:request`});
      return "درخواست برداشت ثبت شد و مبلغ آن رزرو شد.";
    }
    if(input.action==="begin"||input.action==="pay"||input.action==="reject"||input.action==="receive"||input.action==="dispute"||input.action==="review"||input.action==="reverse") {
      const payout=await tx.payout.findUniqueOrThrow({where:{id:input.id}});
      if(input.action==="dispute"||input.action==="review"||input.action==="reverse") {
        if(payout.status!=="PAID"||payout.receivedAt)throw new Error("فقط واریز ثبت‌شده و تأییدنشده قابل پیگیری است.");
        if(input.action!=="dispute"&&!payout.disputedAt)throw new Error("ابتدا گزارش عدم دریافت لازم است.");
        if(input.action==="dispute") {
          await tx.payout.update({where:{id:payout.id},data:{disputedAt:new Date(),disputeReason:input.reason,reviewedAt:null,reviewNote:null}});
        } else {
          await tx.payout.update({where:{id:payout.id},data:{reviewedAt:new Date(),reviewNote:input.reason,...(input.action==="reverse"?{status:"REJECTED",note:"ثبت واریز پس از بررسی مدیر برگشت خورد: "+input.reason}:{})}});
        }
        const review=await tx.payoutReview.create({data:{payoutId:payout.id,actorId:actor.id,action:input.action,message:input.reason}});
        if(input.action==='dispute')await notifyAdmins(tx,{title:'گزارش عدم دریافت وجه',body:'یک درخواست واریز نیاز به بررسی مجدد دارد.',href:'/admin/settlements',eventKey:`payout:${payout.id}:review:${review.id}`});
        else await notifyUsers(tx,[teacherId],{title:'نتیجهٔ بررسی واریز',body:input.reason,href:'/teacher/finance',eventKey:`payout:${payout.id}:review:${review.id}`});
        return input.action==="dispute"?"گزارش عدم دریافت برای مدیر ثبت شد؛ مبلغ دوباره به مانده اضافه نشده است.":input.action==="reverse"?"ثبت واریز برگشت خورد و اثر آن از مانده برداشته شد؛ سابقه حفظ شده است.":"پاسخ بررسی ثبت شد؛ منتظر تأیید دریافت مدرس است.";
      }
      if(input.action==="receive") {
        if(payout.status!=="PAID")throw new Error("واریز هنوز ثبت نشده است.");
        await tx.payout.updateMany({where:{id:payout.id,receivedAt:null},data:{receivedAt:new Date()}});
        return "دریافت وجه تأیید شد.";
      }
      if(input.action==="begin") {
        if(payout.status!=="REQUESTED")throw new Error("این درخواست قبلاً در اختیار مدیر دیگری قرار گرفته است.");
        const wallet=await readWallet(teacherId,tx);
        if(wallet.totals.available<0)throw new Error("مانده کافی نیست؛ درخواست را رد کنید.");
        await tx.payout.update({where:{id:payout.id},data:{status:"PROCESSING",processedBy:actor.id}});
        return "درخواست برای واریز در اختیار شما قرار گرفت. پس از انتقال بانکی نتیجه را ثبت کنید.";
      }
      if(!["REQUESTED","PROCESSING"].includes(payout.status))throw new Error("این درخواست قبلاً رسیدگی شده است.");
      if(payout.status==="PROCESSING"&&payout.processedBy!==actor.id)throw new Error("مدیر دیگری در حال واریز این درخواست است.");
      if(input.action==="reject") {
        await tx.payout.update({where:{id:payout.id},data:{status:"REJECTED",note:input.reason,processedBy:actor.id}});
        await notifyUsers(tx,[teacherId],{title:'نتیجهٔ درخواست برداشت',body:input.reason,href:'/teacher/finance',eventKey:`payout:${payout.id}:rejected`});
        return "درخواست رد شد و مبلغ رزروشده آزاد شد.";
      }
      if(payout.status!=="PROCESSING")throw new Error("ابتدا درخواست را برای واریز رزرو کنید.");
      if(input.fee>=payout.amount)throw new Error("کارمزد باید کمتر از مبلغ تسویه باشد.");
      if(new Date(input.paidAt)<payout.requestedAt)throw new Error("تاریخ واریز نباید قبل از درخواست باشد.");
      const wallet=await readWallet(teacherId,tx);
      if(wallet.totals.available+payout.amount<payout.amount)throw new Error("مانده برای این واریز کافی نیست؛ درخواست را رد کنید.");
      await tx.payout.update({where:{id:payout.id},data:{status:"PAID",fee:input.fee,reference:input.reference,paidAt:new Date(input.paidAt),processedBy:actor.id}});
      await notifyUsers(tx,[teacherId],{title:'واریز وجه ثبت شد',body:'جزئیات واریز را بررسی و دریافت یا عدم دریافت وجه را اعلام کنید.',href:'/teacher/finance',eventKey:`payout:${payout.id}:paid`});
      return "واریز ثبت شد؛ مبلغ از مانده کم شده است.";
    }
    const payment=await tx.payment.findUniqueOrThrow({where:{id:input.paymentId},include:{refund:true,cost:true,course:true}});
    if(payment.status!=="SUCCESS"||payment.isTest!==false||payment.transactionId?.startsWith("MOCK-")||payment.userId===teacherId)throw new Error("فقط پرداخت موفق واقعی قابل ثبت است.");
    if(input.action==="cost") {
      if(payment.cost)throw new Error("کارمزد این پرداخت قبلاً ثبت شده است.");
      if(input.amount>payment.amount)throw new Error("کارمزد از مبلغ پرداخت بیشتر است.");
      await tx.paymentCost.create({data:{paymentId:payment.id,amount:input.amount,createdBy:actor.id}});
      return "کارمزد فروش از سهم پلتفرم ثبت شد.";
    }
    if(payment.refund)throw new Error("این پرداخت قبلاً بازپرداخت شده است.");
    if(payment.paidAt && new Date(input.refundedAt)<payment.paidAt)throw new Error("بازپرداخت نمی‌تواند قبل از پرداخت باشد.");
    if(await tx.payout.count({where:{teacherId,status:"PROCESSING"}}))throw new Error("ابتدا نتیجهٔ واریز در حال انجام این مدرس را مشخص کنید.");
    // A refund can create a debt after a previous payout, carried into future earnings.
    await tx.payout.updateMany({where:{teacherId,status:"REQUESTED"},data:{status:"REJECTED",note:"لغو خودکار به دلیل بازپرداخت فروش؛ مانده را بررسی و دوباره درخواست کنید.",processedBy:actor.id}});
    await tx.paymentRefund.create({data:{paymentId:payment.id,amount:payment.amount,teacherDebit:payment.teacherShareAmount??0,reference:input.reference,reason:input.reason,refundedAt:new Date(input.refundedAt),createdBy:actor.id}});
    const other=await tx.payment.count({where:{id:{not:payment.id},userId:payment.userId,courseId:payment.courseId,status:"SUCCESS",refund:null}});
    if(!other)await tx.enrollment.updateMany({where:{userId:payment.userId,courseId:payment.courseId},data:{status:"CANCELLED"}});
    return "بازپرداخت کامل ثبت و سهم فروش اصلاح شد.";
  },{timeout:15000});
}
