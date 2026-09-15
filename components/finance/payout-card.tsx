import type { Payout } from "@prisma/client";
import LedgerForm from "@/components/finance/ledger-form";
export const financeDate=(value:Date)=>new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tehran'}).format(value);
export default function PayoutCard({payout,admin=false,name,actorId}:{payout:Payout;admin?:boolean;name?:string;actorId?:string}) {
 return <article className="rounded-2xl border border-slate-200 bg-white p-5">
  <div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">{name??'درخواست برداشت'} · {payout.amount.toLocaleString('fa-IR')} تومان</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{payout.status==='REQUESTED'?'در انتظار واریز':payout.status==='PROCESSING'?'در حال واریز':payout.status==='REJECTED'?'ردشده':payout.receivedAt?'دریافت تأیید شده':'واریزشده؛ منتظر تأیید دریافت'}</span></div>
  <p className="mt-3 text-xs leading-7 text-slate-500">درخواست: {financeDate(payout.requestedAt)} · مبنای محاسبهٔ درآمد: {financeDate(payout.cutoffAt)}</p>
  <p className="mt-2 break-all text-sm"><bdi>{payout.accountName}</bdi> · <bdi>{payout.iban}</bdi></p>
  {payout.paidAt&&<p className="mt-3 text-sm leading-8">واریز: {financeDate(payout.paidAt)} · کارمزد: {payout.fee.toLocaleString('fa-IR')} · خالص دریافتی: {(payout.amount-payout.fee).toLocaleString('fa-IR')} تومان · پیگیری: <bdi>{payout.reference}</bdi></p>}
  {payout.receivedAt&&<p className="text-xs text-emerald-700">تأیید دریافت مدرس: {financeDate(payout.receivedAt)}</p>}
  {payout.note&&<p className="mt-3 text-sm text-amber-800">{payout.note}</p>}
  {!admin&&payout.status==='PAID'&&!payout.receivedAt&&<LedgerForm action="receive" fixed={{id:payout.id}} label="وجه را دریافت کردم" />}
  {admin&&payout.status==='REQUESTED'&&<LedgerForm action="begin" fixed={{id:payout.id}} label="رزرو درخواست برای واریز" />}
  {admin&&payout.status==='PROCESSING'&&payout.processedBy!==actorId&&<p className="mt-4 text-sm text-amber-800">مدیر دیگری مسئول این واریز است؛ دوباره وجه واریز نکنید.</p>}
  {admin&&['REQUESTED','PROCESSING'].includes(payout.status)&&(payout.status==='REQUESTED'||payout.processedBy===actorId)&&<>
    <p className="mt-4 text-xs leading-7 text-slate-500">پس از واریز واقعی ثبت کنید. کارمزد انتقال از مبلغ درخواست کم می‌شود؛ خالص واریز = مبلغ درخواست − کارمزد.</p>
    {payout.status==='PROCESSING'&&<LedgerForm action="pay" fixed={{id:payout.id}} label="ثبت واریز انجام‌شده" fields={[{name:'fee',label:'کارمزد انتقال (تومان)',type:'number',value:0,min:0,max:payout.amount-1},{name:'reference',label:'شماره پیگیری بانکی'},{name:'paidAt',label:'تاریخ و ساعت واریز',type:'datetime-local'}]} />}
    <details className="mt-4 text-sm"><summary className="cursor-pointer text-rose-700">رد درخواست و آزادسازی مبلغ</summary><LedgerForm action="reject" fixed={{id:payout.id}} fields={[{name:'reason',label:'دلیل رد'}]} label="رد درخواست" /></details>
  </>}
 </article>;
}
