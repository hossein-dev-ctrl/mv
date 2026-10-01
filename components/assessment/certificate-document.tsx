import Image from 'next/image';
import type {CSSProperties} from 'react';
import {certificateDesign} from '@/lib/certificate-templates';
type Props={design:unknown;studentName:string;courseTitle:string;score:number;issuedAt:Date;id:string;qr?:string|null;valid?:boolean;preview?:boolean;isTest?:boolean};
export default function CertificateDocument({design,studentName,courseTitle,score,issuedAt,id,qr,valid=true,preview=false,isTest=false}:Props){
 const t=certificateDesign(design);
 return <article className={`certificate-document certificate-${t.style.toLowerCase()}`} style={{'--certificate-accent':t.accent} as CSSProperties}>
  <div className="certificate-decoration" aria-hidden="true"/>
  <div className="certificate-inner">
   <p className="certificate-issuer">{t.issuer}</p><p lang="en" dir="ltr" className="text-sm tracking-widest text-slate-500">{t.issuerEn}</p>
   <p className={`certificate-state ${preview||isTest?'text-amber-800 bg-amber-50':valid?'text-emerald-800 bg-emerald-50':'text-rose-800 bg-rose-50'}`}>{!valid?'گواهی باطل شده — Invalid certificate':preview?'پیش‌نمایش طراحی — فاقد اعتبار':isTest?'مدرک آزمایشی — فاقد اعتبار رسمی':valid?'گواهی معتبر است · Valid certificate':'گواهی فاقد اعتبار است · Invalid certificate'}</p>
   <h1>گواهی‌نامهٔ پایان دوره</h1><h2 lang="en" dir="ltr">Certificate of Completion</h2>
   <p className="mt-7 text-sm text-slate-500">گواهی می‌شود / This certifies that</p>
   <p className="certificate-student">{studentName}</p>
   <p className="text-sm leading-8">دورهٔ زیر را با موفقیت به پایان رسانده است.</p><p lang="en" dir="ltr" className="text-xs text-slate-500">has successfully completed the following course.</p>
   <h3 className="certificate-course">{courseTitle}</h3>
   <p className="text-sm leading-8">نمرهٔ نهایی: {score.toLocaleString('fa-IR')} از ۱۰۰</p><p lang="en" dir="ltr" className="text-xs">Final score: {score} / 100</p>
   <div className="certificate-bottom"><div><p className="mb-2 text-xs text-slate-500">تأییدکننده / Issued by</p><p className="font-bold">{t.signatory||t.issuer}</p><p className="mt-4 text-xs">{issuedAt.toLocaleDateString('fa-IR',{timeZone:'Asia/Tehran'})}</p><p className="mt-2 text-xs" lang="en" dir="ltr">{issuedAt.toLocaleDateString('en-GB',{timeZone:'Asia/Tehran'})}</p></div><div>{qr?<Image unoptimized src={qr} alt="QR استعلام گواهی" width={120} height={120}/>:<div className="certificate-qr-placeholder"><span>{preview?'محل QR استعلام':'QR با تنظیم نشانی سایت فعال می‌شود'}</span></div>}</div></div>
   <p className="mt-5 text-xs text-slate-500">شناسهٔ استعلام / Verification ID</p><bdi className="mt-2 block break-all text-xs">{id}</bdi>
   <p className="mt-5 text-xs leading-6 text-slate-500">این گواهی تأیید پایان دوره در پلتفرم است و معادل مدرک دانشگاهی یا تأیید نهاد دولتی نیست.</p>
  </div>
 </article>;
}
