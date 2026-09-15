import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFinanceUser } from "@/lib/finance";
import LedgerForm from "@/components/finance/ledger-form";
import PayoutCard, { financeDate } from "@/components/finance/payout-card";

export default async function SettlementsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const actor=await requireFinanceUser(true);
 const query=await searchParams;
 const status=typeof query.status==='string'&&['PROCESSING','PAID','REJECTED','ALL'].includes(query.status)?query.status:'REQUESTED';
 const settings=await prisma.financeSettings.findUnique({where:{id:'main'}});
 const where:Prisma.PayoutWhereInput={...(status==='ALL'?{}:{status}),...(process.env.NODE_ENV==='production'?{teacher:{demoBatchId:null}}:{})};
 const count=await prisma.payout.count({where});const pages=Math.max(1,Math.ceil(count/20));
 const positive=(value:unknown)=>typeof value==='string'&&Number.isSafeInteger(Number(value))&&Number(value)>0?Number(value):1;
 const page=Math.min(positive(query.page),pages);
 const payouts=await prisma.payout.findMany({where,orderBy:{requestedAt:'desc'},take:20,skip:(page-1)*20,include:{teacher:{select:{name:true,email:true}}}});
 const searchId=typeof query.paymentId==='string'?query.paymentId.trim().slice(0,100):'';
 const paymentWhere:Prisma.PaymentWhereInput={status:'SUCCESS',isTest:false,...(process.env.NODE_ENV==='production'?{course:{demoBatchId:null}}:{}),...(searchId?{id:searchId}:{}),OR:[{transactionId:null},{transactionId:{not:{startsWith:'MOCK-'}}}]};
 const paymentCount=await prisma.payment.count({where:paymentWhere});const paymentPages=Math.max(1,Math.ceil(paymentCount/20));const paymentPage=Math.min(positive(query.paymentPage),paymentPages);
 const payments=await prisma.payment.findMany({where:paymentWhere,orderBy:{createdAt:'desc'},take:20,skip:(paymentPage-1)*20,include:{refund:true,cost:true,course:{select:{title:true,teacherId:true}},user:{select:{name:true}}}});
 const url=(p:number,pp:number)=>`/admin/settlements?${new URLSearchParams({status,page:String(p),paymentPage:String(pp),...(searchId?{paymentId:searchId}:{})})}`;
 return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
  <Link href="/admin/finance" className="text-sm text-indigo-600">بازگشت به مالی کل</Link><h1 className="my-5 text-2xl font-bold">تسویه و بازپرداخت</h1>
  <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">حداقل مبلغ درخواست برداشت</h2><LedgerForm action="settings" label="ذخیرهٔ حداقل برداشت" fields={[{name:'minimum',label:'مبلغ به تومان',type:'number',value:settings?.minimumPayout??undefined,min:1,max:2000000000}]} /><p className="mt-3 text-xs text-slate-500">برای درخواست‌های جدید اعمال می‌شود. افزایش حداقل، درخواست‌های قبلی را لغو نمی‌کند.</p></section>
  <h2 className="mt-8 text-xl font-bold">درخواست‌های مدرس‌ها</h2>
  <nav aria-label="وضعیت درخواست برداشت" className="my-5 flex flex-wrap gap-2">{[['REQUESTED','در انتظار'],['PROCESSING','در حال واریز'],['PAID','واریزشده'],['REJECTED','ردشده'],['ALL','همه']].map(([value,label])=><Link key={value} href={`/admin/settlements?status=${value}`} aria-current={status===value?'page':undefined} className={`rounded-xl px-4 py-2 text-sm ${status===value?'bg-indigo-600 text-white':'bg-white text-slate-600'}`}>{label}</Link>)}</nav>
  <p className="mb-4 text-xs leading-7 text-slate-500">این صفحه انتقال بانکی انجام نمی‌دهد. قبل از ثبت واریز، مبلغ، صاحب حساب و شبا را با انتقال واقعی تطبیق دهید. شمارهٔ پیگیری تکراری پذیرفته نمی‌شود.</p>
  <div className="space-y-4">{payouts.map(payout=><PayoutCard key={payout.id} payout={payout} admin actorId={actor.id} name={payout.teacher.name||payout.teacher.email||'مدرس'} />)}{payouts.length===0&&<p className="rounded-xl border bg-white p-5">درخواستی با این وضعیت وجود ندارد.</p>}</div>
  <nav className="my-5 flex justify-center gap-4 text-sm" aria-label="صفحه‌بندی درخواست‌ها">{page>1&&<Link href={url(page-1,paymentPage)}>قبل</Link>}<span>{page.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}</span>{page<pages&&<Link href={url(page+1,paymentPage)}>بعد</Link>}</nav>
  <h2 className="mt-10 text-xl font-bold">بازپرداخت مشتری و کارمزد فروش</h2><p className="mt-3 text-sm leading-7 text-slate-600">بازپرداخت در این مرحله کامل است. قبل از برگشت وجه، درخواست در حال واریز مدرس باید تعیین تکلیف شود. پس از برگشت واقعی وجه ثبت کنید؛ سهم فروش برگشت می‌خورد و در صورت نبود خرید معتبر دیگر، دسترسی دوره لغو می‌شود. درخواست باز مدرس برای محاسبهٔ مجدد لغو خواهد شد. کارمزد فروش بر عهدهٔ پلتفرم است.</p>
  <form action="/admin/settlements" className="my-5 flex flex-wrap items-end gap-3"><label className="text-sm">شناسهٔ پرداخت<input name="paymentId" defaultValue={searchId} className="ms-3 rounded-xl border p-2" /></label><input type="hidden" name="status" value={status}/><button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white">جست‌وجو</button></form>
  <div className="space-y-4">{payments.map(payment=><article key={payment.id} className="rounded-2xl border bg-white p-5">
    <h3 className="font-bold">{payment.course.title} · {payment.user.name||'کاربر'} · {payment.amount.toLocaleString('fa-IR')} تومان</h3><p className="mt-2 break-all text-xs text-slate-500">شناسه: <bdi>{payment.id}</bdi> · پیگیری فروش: <bdi>{payment.transactionId||'—'}</bdi></p>
    {payment.refund?<p className="mt-3 text-sm text-rose-700">بازپرداخت‌شده: {financeDate(payment.refund.refundedAt)} · پیگیری: <bdi>{payment.refund.reference}</bdi> · {payment.refund.reason}</p>:payment.userId!==payment.course.teacherId&&<details className="mt-4"><summary className="cursor-pointer text-sm text-rose-700">ثبت بازپرداخت کامل انجام‌شده</summary><LedgerForm action="refund" fixed={{paymentId:payment.id}} label="ثبت بازپرداخت کامل" fields={[{name:'reference',label:'پیگیری بازپرداخت'},{name:'refundedAt',label:'زمان بازپرداخت',type:'datetime-local'},{name:'reason',label:'علت بازپرداخت'}]} /></details>}
    {payment.cost?<p className="mt-3 text-sm">کارمزد ثبت‌شدهٔ فروش: {payment.cost.amount.toLocaleString('fa-IR')} تومان</p>:payment.userId!==payment.course.teacherId&&<details className="mt-4"><summary className="cursor-pointer text-sm text-indigo-600">ثبت کارمزد بانکی فروش</summary><LedgerForm action="cost" fixed={{paymentId:payment.id}} label="ثبت کارمزد واقعی" fields={[{name:'amount',label:'کارمزد (تومان)',type:'number',min:0,max:payment.amount}]} /></details>}
  </article>)}{payments.length===0&&<p>پرداخت موفق واقعی پیدا نشد.</p>}</div>
  <nav className="my-5 flex justify-center gap-4 text-sm" aria-label="صفحه‌بندی پرداخت‌ها">{paymentPage>1&&<Link href={url(page,paymentPage-1)}>قبل</Link>}<span>{paymentPage.toLocaleString('fa-IR')} از {paymentPages.toLocaleString('fa-IR')}</span>{paymentPage<paymentPages&&<Link href={url(page,paymentPage+1)}>بعد</Link>}</nav>
 </main>;
}
