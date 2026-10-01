import {z} from 'zod';
export const templateInput=z.object({name:z.string().trim().min(2).max(80),style:z.enum(['CLASSIC','MODERN','KIDS']),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/),issuer:z.string().trim().min(2).max(100),issuerEn:z.string().trim().min(2).max(100),signatory:z.string().trim().max(100),active:z.boolean()});
export type CertificateDesign=z.infer<typeof templateInput>;
export const defaultDesign:CertificateDesign={name:'قالب کلاسیک',style:'CLASSIC',accent:'#4338ca',issuer:'آموزش آنلاین',issuerEn:'Online Learning',signatory:'مدیریت آموزش',active:true};
export const styleLabels={CLASSIC:'کلاسیک رسمی',MODERN:'مدرن',KIDS:'رنگی کودک و نوجوان'};
export function certificateDesign(raw:unknown):CertificateDesign{const parsed=templateInput.safeParse(raw);return parsed.success?parsed.data:defaultDesign;}
