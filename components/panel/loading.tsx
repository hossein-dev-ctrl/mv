export function Spinner({small=false}:{small?:boolean}) {
 return <span aria-hidden="true" className={`loading-spinner ${small?'h-5 w-5':'h-10 w-10'}`}/>;
}
export default function PageLoading(){
 return <div role="status" aria-live="polite" className="mx-auto flex min-h-64 max-w-6xl flex-col items-center justify-center gap-4 p-8"><div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm"><Spinner/></div><p className="text-sm font-medium text-slate-600">در حال آماده‌سازی صفحه…</p><span className="text-xs text-slate-400">لطفاً چند لحظه صبر کنید</span></div>;
}
