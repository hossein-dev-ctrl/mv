import { faDigits } from '@/lib/persian-numbers';
const names=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const formatter=new Intl.DateTimeFormat('en-US-u-ca-persian',{year:'numeric',month:'numeric',timeZone:'Asia/Tehran'});
export function persianMonthKey(date:Date) {
 const parts=formatter.formatToParts(date);return Number(parts.find(p=>p.type==='year')!.value)*12+Number(parts.find(p=>p.type==='month')!.value)-1;
}
export function recentPersianMonths(now=new Date()) {
 const current=persianMonthKey(now);
 return Array.from({length:6},(_,i)=>{const key=current-5+i;return {key,label:names[key%12]+' '+faDigits(Math.floor(key/12)),sales:0,paid:0,refunds:0};});
}
