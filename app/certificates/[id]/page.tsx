import CertificateDocument from '@/components/assessment/certificate-document';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import QRCode from 'qrcode';
import {prisma} from '@/lib/prisma';
import {certificateValid} from '@/lib/certificates';
import {PrintCertificate} from '@/components/assessment/certificate-actions';
export const dynamic='force-dynamic';
export const metadata={title:'استعلام گواهی‌نامه',robots:{index:false,follow:false}};
export default async function Certificate({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))notFound();
 const c=await prisma.certificate.findUnique({where:{id},include:{enrollment:{select:{status:true}}}});if(!c||(c.isTest&&process.env.NODE_ENV!=='development'))notFound();
 const valid=certificateValid(c);const base=process.env.PUBLIC_SITE_URL?.replace(/\/$/,'');
 const qr=base&&/^https?:\/\//.test(base)?await QRCode.toDataURL(`${base}/certificates/${c.id}`,{width:180,margin:2,errorCorrectionLevel:'M'}):null;
 return <main className="mx-auto max-w-4xl px-4 py-10"><nav className="mb-6 flex flex-wrap gap-3 print:hidden"><Link className="panel-action" href="/certificates">استعلام مدرک دیگر</Link><Link className="panel-action" href="/dashboard">پنل کاربری</Link>{valid&&<PrintCertificate/>}</nav><CertificateDocument design={c.templateSnapshot} studentName={c.studentName} courseTitle={c.courseTitle} score={c.score} issuedAt={c.issuedAt} id={c.id} qr={qr} valid={valid} isTest={c.isTest}/></main>;
}
