type Sale={amount:number;paidAt:Date|null;refund:{amount:number;refundedAt:Date}|null};
type Payout={amount:number;paidAt:Date|null;status:string};
export default function FinancialChart({sales,payouts}:{sales:Sale[];payouts:Payout[]}) {
 const now=new Date();const months=Array.from({length:6},(_,i)=>{const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-5+i,1));return {key:d.toISOString().slice(0,7),label:new Intl.DateTimeFormat('fa-IR-u-ca-gregory',{month:'short',year:'numeric',timeZone:'UTC'}).format(d),sales:0,paid:0,refunds:0};});
 for(const sale of sales){const month=months.find(m=>m.key===sale.paidAt?.toISOString().slice(0,7));if(month)month.sales+=sale.amount;const refundMonth=months.find(m=>m.key===sale.refund?.refundedAt.toISOString().slice(0,7));if(refundMonth)refundMonth.refunds+=sale.refund!.amount;}
 for(const payout of payouts){const month=months.find(m=>m.key===payout.paidAt?.toISOString().slice(0,7));if(month&&payout.status==='PAID')month.paid+=payout.amount;}
 const max=Math.max(1,...months.flatMap(m=>[m.sales,m.paid,m.refunds]));
 return <section className="my-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">روند مالی شش ماه اخیر</h2><p className="mt-2 text-xs text-slate-500">ماه میلادی · تومان · فروش واقعی، تسویه از مانده و بازپرداخت کامل</p>
 <div className="my-4 flex flex-wrap gap-4 text-xs"><span className="text-indigo-600">■ فروش</span><span className="text-emerald-600">■ تسویه</span><span className="text-rose-600">■ بازپرداخت</span></div>
 <div aria-hidden="true" className="flex h-52 items-end justify-around gap-2 border-b border-slate-200">{months.map(m=><div key={m.key} className="flex h-full flex-1 items-end justify-center gap-1">{[['sales','bg-indigo-500'],['paid','bg-emerald-500'],['refunds','bg-rose-400']].map(([key,color])=><div key={key} title={`${m.label}: ${m[key as 'sales'].toLocaleString('fa-IR')} تومان`} className={`w-1/5 rounded-t ${color}`} style={{height:`${m[key as 'sales']/max*100}%`}} />)}</div>)}</div>
 <div className="mt-3 grid grid-cols-6 gap-2 text-center text-[10px] text-slate-500">{months.map(m=><span key={m.key}>{m.label}</span>)}</div>
 <details className="mt-5 text-xs"><summary className="cursor-pointer text-indigo-600">جدول ارقام نمودار</summary><div className="overflow-x-auto"><table className="mt-3 w-full text-right"><thead><tr>{['ماه','فروش','تسویه','بازپرداخت'].map(x=><th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{months.map(m=><tr key={m.key}><th className="p-2">{m.label}</th>{[m.sales,m.paid,m.refunds].map((v,i)=><td key={i} className="p-2">{v.toLocaleString('fa-IR')}</td>)}</tr>)}</tbody></table></div></details>
 </section>;
}
