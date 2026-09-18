import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireFinanceUser } from '@/lib/finance';
import { prisma } from '@/lib/prisma';
import { demoEnabled } from '@/lib/finance-demo';
import DemoControls from '@/components/finance/demo-controls';
export default async function FinanceDemoPage(){
 if(!demoEnabled())notFound();const admin=await requireFinanceUser(true);const batch=await prisma.demoBatch.findUnique({where:{ownerId:admin.id}});
 return <main className="mx-auto max-w-4xl px-4 py-8"><Link href="/admin/finance" className="panel-action panel-action-indigo">بازگشت به مالی</Link><h1 className="my-5 text-2xl font-bold">آزمایش مالی بدون درگاه</h1><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-8">فقط هنگام اجرای npm run dev فعال است. یک مدرس، شش دانش‌آموز و یک دورهٔ غیرعمومی جدا ساخته می‌شوند. هیچ پیامک، انتقال پول یا تغییری در حساب‌های واقعی انجام نمی‌شود. تراکنش‌های این بسته فقط برای تمرین دفتر مالی هستند.</div><DemoControls exists={!!batch}/><ol className="list-inside list-decimal space-y-3 rounded-2xl border bg-white p-6 text-sm leading-8"><li>در بخش تسویهٔ مدیر، حداقل برداشت را تعیین کنید؛ تنظیم فعلی حفظ می‌شود.</li><li>دادهٔ تست بسازید و مشخصات ورود نمایش‌داده‌شده را نگه دارید.</li><li>در پنجرهٔ خصوصی با حساب مدرس آزمایشی وارد /teacher/finance شوید.</li><li>مبلغی بین حداقل و مانده وارد کنید؛ نام آزمایشی و شبای نمونه را وارد کنید.</li><li>در پنجرهٔ مدیر از /admin/settlements درخواست را رزرو و واریز نمونه را با شماره پیگیری مانند DEMO-PAYOUT-1 ثبت کنید. هیچ پولی واقعاً واریز نکنید.</li><li>با مدرس دریافت وجه را تأیید کنید؛ سپس کارمزد و بازپرداخت نمونه را بررسی کنید.</li><li>به این صفحه برگردید و بستهٔ آزمایشی را پاک کنید؛ حداقل برداشت و دیگر داده‌های واقعی باقی می‌مانند.</li></ol></main>;
}
