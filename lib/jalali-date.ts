const partsFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {year:'numeric',month:'numeric',day:'numeric',timeZone:'Asia/Tehran'});
export const jalaliMonths=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
export function jalaliParts(date:Date) {
 const parts=partsFormatter.formatToParts(date);
 const part=(type:string)=>Number(parts.find(p=>p.type===type)?.value);
 return {year:part('year'),month:part('month'),day:part('day')};
}
const starts=new Map<number,number>();
export function jalaliYearStart(year:number) {
 if(!Number.isInteger(year)||year<1300||year>1600)throw Error('سال خارج از محدوده است.');
 if(starts.has(year))return starts.get(year)!;
 for(let day=18;day<=24;day++) {
  const value=Date.UTC(year+621,2,day,12);const p=jalaliParts(new Date(value));
  if(p.year===year&&p.month===1&&p.day===1){starts.set(year,value);return value;}
 }
 throw Error('تاریخ نامعتبر است.');
}
export function jalaliDays(year:number,month:number) {
 if(month<=6)return 31;if(month<=11)return 30;
 return Math.round((jalaliYearStart(year+1)-jalaliYearStart(year))/86400000)-336;
}
export function jalaliToIso(year:number,month:number,day:number,hour:number,minute:number) {
 if(![year,month,day,hour,minute].every(Number.isInteger)||month<1||month>12||day<1||day>jalaliDays(year,month)||hour<0||hour>23||minute<0||minute>59)throw Error('تاریخ یا ساعت نامعتبر است.');
 const days=(month<=6?(month-1)*31:186+(month-7)*30)+day-1;
 const date=new Date(jalaliYearStart(year)+days*86400000);
 const target=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),hour,minute);
 const localFormatter=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 let candidate=target;
 for(let i=0;i<3;i++) {
  const parts=localFormatter.formatToParts(new Date(candidate));
  const part=(type:string)=>Number(parts.find(p=>p.type===type)?.value);
  const local=Date.UTC(part('year'),part('month')-1,part('day'),part('hour'),part('minute'));
  if(local===target)return new Date(candidate).toISOString();
  candidate+=target-local;
 }
 throw Error('این ساعت محلی به دلیل تغییر ساعت رسمی وجود ندارد.');
}
