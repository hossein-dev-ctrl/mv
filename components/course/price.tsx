import { coursePrice } from '@/lib/course-price';
export default function CoursePrice({price,discountPercent=0}:{price:number;discountPercent?:number}) {
 const final=coursePrice({price,discountPercent});
 return <span className="inline-flex flex-wrap items-center gap-3">{discountPercent>0&&<><del className="text-sm font-normal text-slate-400">{price.toLocaleString('fa-IR')} تومان</del><span className="rounded-full bg-rose-50 px-2 py-1 text-xs text-rose-700">{discountPercent.toLocaleString('fa-IR')}٪ تخفیف</span></>}<span>{final===0?'رایگان':`${final.toLocaleString('fa-IR')} تومان`}</span></span>;
}
