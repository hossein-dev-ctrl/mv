export type IconName='book'|'users'|'settings'|'chart'|'layers'|'play'|'file'|'check'|'award'|'star'|'message'|'bell'|'wallet'|'arrow'|'plus'|'edit'|'trash'|'download'|'logout'|'search';
const paths:Record<IconName,string>={
 check:'m5 12 4 4L19 6',
 award:'M8 14 6 22l6-3 6 3-2-8M19 8a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
 star:'m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
 message:'M21 4H3v14h5l4 4 4-4h5V4ZM7 9h10M7 13h7',
 bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
 wallet:'M3 5h17v15H3V5Zm0 0 14-3v3M15 10h7v6h-7v-6ZM18 13h1',
 arrow:'M5 12h14m-6-6 6 6-6 6',
 plus:'M12 5v14M5 12h14',
 edit:'m15 3 6 6-12 12H3v-6L15 3Zm-9 9 6 6',
 trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
 download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
 logout:'M9 3H3v18h6M8 12h13m-5-5 5 5-5 5',
 search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',

 book:'M12 5v16M12 5C8 2 4 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-2-1-6-2-10 1Z',
 users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 settings:'m9 3-1 3-3 1-2 3 2 2-1 3 3 2 3-1 2 2 3-1 1-3 3-1 1-3-2-2 1-3-3-2-3 1-2-2-3 1ZM15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 chart:'M4 20V10M10 20V4M16 20v-7M22 20V7',
 layers:'m12 2 10 5-10 5L2 7l10-5ZM2 12l10 5 10-5M2 17l10 5 10-5',
 play:'m10 8 6 4-6 4V8ZM22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
 file:'M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 12h8M8 16h6',
};
export default function ThemeIcon({name,className='h-6 w-6'}:{name:IconName;className?:string}){
 return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 inline-block align-middle ${className}`}><path d={paths[name]}/></svg>;
}

export function relatedIcon(text:string):IconName{
 if(/تیکت|پیام|ticket|بازخورد|نظر/.test(text))return 'message';
 if(/آزمون|کارنامه|نمره|exam|grade/.test(text))return 'award';
 if(/تکلیف|تمرین|assignment|submission|فایل/.test(text))return 'file';
 if(/پرداخت|درآمد|مالی|واریز|برداشت|finance|payment|payout|refund/.test(text))return 'wallet';
 if(/دانش|کاربر|مدرس|student|user|interest/.test(text))return 'users';
 if(/اعلان|notification|dispatch/.test(text))return 'bell';
 if(/گزارش|پیشرفت/.test(text))return 'chart';
 if(/تنظیم|ویرایش/.test(text))return 'settings';
 if(/دوره|درس|course|lesson/.test(text))return 'book';
 return 'bell';
}
