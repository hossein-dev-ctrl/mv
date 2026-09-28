import {createHmac,timingSafeEqual} from 'node:crypto';
export const OTP_SECONDS=300;
export function normalizePhone(value:unknown){
 if(typeof value!=='string')throw Error('شماره موبایل معتبر وارد کنید.');
 let phone=value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[\s()-]/g,'');
 phone=phone.replace(/^(?:\+98|0098|98)(9\d{9})$/,'0$1');
 if(!/^09\d{9}$/.test(phone))throw Error('شماره موبایل معتبر وارد کنید.');
 return phone;
}
export function otpDigest(phone:string,challenge:string,code:string){
 if(!process.env.AUTH_SECRET)throw Error('AUTH_SECRET is missing');
 return createHmac('sha256',process.env.AUTH_SECRET).update(`${phone}:${challenge}:${code}`).digest('hex');
}
export function matchesOtp(expected:string,actual:string){
 return expected.length===actual.length&&timingSafeEqual(Buffer.from(expected),Buffer.from(actual));
}
export function failedAttempt(attempts:number,consecutive:number){
 return {attempts:attempts+1,consecutiveFailures:consecutive+1,blocked:consecutive+1>=10,restart:attempts+1>=3};
}
export function safeRedirect(value:string|null,fallback:string){return value&&value.startsWith('/')&&!value.startsWith('//')&&!/[\\\r\n]/.test(value)?value:fallback;}
