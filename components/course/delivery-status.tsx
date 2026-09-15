export const deliveryLabels:Record<string,string>={UPCOMING:'به‌زودی · پیش‌ثبت‌نام',ONGOING:'در حال برگزاری',COMPLETED:'پایان‌یافته'};
export default function DeliveryStatus({status='ONGOING'}:{status?:string}){return <span className="inline-block rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-800">{deliveryLabels[status]??status}</span>;}
