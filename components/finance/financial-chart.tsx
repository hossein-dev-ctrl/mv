import { persianMonthKey, recentPersianMonths } from "@/lib/persian-months";
type Sale={amount:number;paidAt:Date|null;refund:{amount:number;refundedAt:Date}|null};
type Payout={amount:number;paidAt:Date|null;status:string};
export default function FinancialChart({sales,payouts}:{sales:Sale[];payouts:Payout[]}) {
 const months=recentPersianMonths();
 for(const sale of sales){const month=months.find(m=>sale.paidAt && m.key===persianMonthKey(sale.paidAt));if(month)month.sales+=sale.amount;const refundMonth=months.find(m=>sale.refund && m.key===persianMonthKey(sale.refund.refundedAt));if(refundMonth)refundMonth.refunds+=sale.refund!.amount;}
 for(const payout of payouts){const month=months.find(m=>payout.paidAt && m.key===persianMonthKey(payout.paidAt));if(month&&payout.status==='PAID')month.paid+=payout.amount;}
 const max=Math.max(1,...months.flatMap(m=>[m.sales,m.paid,m.refunds]));
 const gross=sales.reduce((sum,sale)=>sum+sale.amount,0);
 const refunded=sales.reduce((sum,sale)=>sum+(sale.refund?.amount??0),0);
 const refundPercent=gross?refunded/gross*100:0;
 return <section className="my-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">روند مالی شش ماه اخیر</h2><p className="mt-2 text-xs text-slate-500">ماه شمسی · تومان · فروش واقعی، تسویه از مانده و بازپرداخت کامل</p>
 <div className="my-4 flex flex-wrap gap-4 text-xs"><span className="text-indigo-600">■ فروش</span><span className="text-emerald-600">■ تسویه</span><span className="text-rose-600">■ بازپرداخت</span></div>
 <div aria-hidden="true" className="flex h-52 items-end justify-around gap-2 border-b border-slate-200">{months.map(m=><div key={m.key} className="flex h-full flex-1 items-end justify-center gap-1">{[['sales','bg-indigo-500'],['paid','bg-emerald-500'],['refunds','bg-rose-400']].map(([key,color])=><div key={key} title={`${m.label}: ${m[key as 'sales'].toLocaleString('fa-IR')} تومان`} className={`w-1/5 rounded-t ${color}`} style={{height:`${m[key as 'sales']/max*100}%`}} />)}</div>)}</div>
 <div className="mt-3 grid grid-cols-6 gap-2 text-center text-[10px] text-slate-500">{months.map(m=><span key={m.key}>{m.label}</span>)}</div>
 <details className="mt-5 text-xs"><summary className="cursor-pointer text-indigo-600">جدول ارقام نمودار</summary><div className="overflow-x-auto"><table className="mt-3 w-full text-right"><thead><tr>{['ماه','فروش','تسویه','بازپرداخت'].map(x=><th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{months.map(m=><tr key={m.key}><th className="p-2">{m.label}</th>{[m.sales,m.paid,m.refunds].map((v,i)=><td key={i} className="p-2">{v.toLocaleString('fa-IR')}</td>)}</tr>)}</tbody></table></div></details>
 <div className="mt-6 flex flex-wrap items-center gap-6 rounded-2xl border bg-slate-50 p-5"><div role="img" aria-label={`سهم بازپرداخت از کل فروش: ${Math.round(refundPercent).toLocaleString('fa-IR')} درصد`} className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full" style={{background:gross?`conic-gradient(#fb7185 0% ${refundPercent}%, #6366f1 ${refundPercent}% 100%)`:'#e2e8f0'}}><span className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-sm">{gross?'کل فروش':'بدون داده'}</span></div><div className="text-sm leading-8"><h3 className="font-bold">ترکیب کل فروش و بازپرداخت</h3><p>■ فروش پس از بازپرداخت: {(gross-refunded).toLocaleString('fa-IR')} تومان</p><p className="text-rose-600">■ بازپرداخت: {refunded.toLocaleString('fa-IR')} تومان</p><p className="text-xs text-slate-500">تمام سوابق؛ مستقل از بازهٔ نمودار ماهانه</p></div></div>
 </section>;
}
