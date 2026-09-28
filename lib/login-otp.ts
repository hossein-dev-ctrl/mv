import {randomInt,randomUUID,createHash} from 'node:crypto';
import {prisma} from '@/lib/prisma';
import {sendSms} from '@/lib/sms';
import {normalizePhone,otpDigest,matchesOtp,failedAttempt,OTP_SECONDS} from '@/lib/otp-policy';
export const blockedMessage='شماره شما بلاک شد؛ با پشتیبانی تماس بگیرید.';
// Database locks serialize resends/verifications across processes. Failed attempts must commit.
export async function requestOtp(raw:unknown,rateKey:string){
 const phone=normalizePhone(raw),now=new Date(),challengeId=randomUUID();
 const localCode=process.env.NODE_ENV==='development'&&/^\d{6}$/.test(process.env.OTP_LOCAL_TEST_CODE||'')?process.env.OTP_LOCAL_TEST_CODE:null;
 const code=localCode||String(randomInt(100000,1000000));
 const digest=otpDigest(phone,challengeId,code);
 const result=await prisma.$transaction(async tx=>{
  const key=createHash('sha256').update(rateKey).digest('hex');
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`otp-rate:${key}`}))`;
  const bucket=await tx.otpRateBucket.findUnique({where:{key}});
  const reset=!bucket||now.getTime()-bucket.windowStart.getTime()>=3600000;
  const limit=rateKey==='global'?300:30;
  if(!reset&&bucket.count>=limit)return {error:'تعداد درخواست‌ها زیاد است؛ یک ساعت بعد تلاش کنید.'};
  await tx.otpRateBucket.upsert({where:{key},create:{key,count:1,windowStart:now},update:{count:reset?1:{increment:1},...(reset?{windowStart:now}:{})}});
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`otp:${phone}`}))`;
  const row=await tx.loginOtp.upsert({where:{phone},create:{phone},update:{}});
  if(row.blockedAt)return {error:blockedMessage};
  if(row.lastSentAt&&now.getTime()-row.lastSentAt.getTime()<60000)return {error:'برای ارسال مجدد حداقل یک دقیقه صبر کنید.'};
  const newWindow=now.getTime()-row.windowStart.getTime()>=3600000;
  if(!newWindow&&row.sentCount>=5)return {error:'حداکثر پنج پیامک در ساعت؛ بعداً تلاش کنید.'};
  const expiresAt=new Date(now.getTime()+OTP_SECONDS*1000);
  await tx.loginOtp.update({where:{phone},data:{challengeId,digest,expiresAt,attempts:0,lastSentAt:now,sentCount:newWindow?1:{increment:1},...(newWindow?{windowStart:now}:{})}});
  return {expiresAt};
 });
 if('error' in result)throw Error(result.error);
 if(localCode)return {challengeId,expiresAt:result.expiresAt};
 try{
  const pattern=process.env.FARAZ_SMS_OTP_PATTERN;
  const response=await sendSms(pattern?{type:'pattern',phone,patternCode:pattern,variables:{[process.env.FARAZ_SMS_OTP_VARIABLE||'code']:code}}:{type:'simple',phone,message:`کد ورود شما: ${code}\nاعتبار: ۵ دقیقه. این کد را در اختیار دیگران قرار ندهید.`});
  if(!['success','ok'].includes(String(response.status).toLowerCase()))throw Error('provider rejected');
 }catch{
  await prisma.loginOtp.updateMany({where:{phone,challengeId},data:{digest:null,challengeId:null,expiresAt:null}});
  throw Error('ارسال پیامک انجام نشد؛ تنظیمات سرویس را بررسی کنید یا کمی بعد تلاش کنید.');
 }
 return {challengeId,expiresAt:result.expiresAt};
}
export async function verifyOtp(challengeId:string,rawCode:unknown){
 const code=typeof rawCode==='string'?rawCode.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).trim():'';
 const found=await prisma.loginOtp.findUnique({where:{challengeId}});
 if(!found)return {error:'کد منقضی شده است؛ دوباره شماره را وارد کنید.',restart:true};
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`otp:${found.phone}`}))`;
  const row=await tx.loginOtp.findUnique({where:{phone:found.phone}});
  if(row?.blockedAt)return {error:blockedMessage,restart:true};
  if(!row||row.challengeId!==challengeId||!row.digest||!row.expiresAt||row.expiresAt<=new Date())return {error:'زمان وارد کردن کد تمام شده؛ دوباره شماره را وارد کنید.',restart:true};
  if(!/^\d{6}$/.test(code)||!matchesOtp(row.digest,otpDigest(row.phone,challengeId,code))){
   const f=failedAttempt(row.attempts,row.consecutiveFailures);
   await tx.loginOtp.update({where:{phone:row.phone},data:{attempts:f.attempts,consecutiveFailures:f.consecutiveFailures,...(f.blocked?{blockedAt:new Date()}:{}),...(f.restart||f.blocked?{digest:null,challengeId:null,expiresAt:null}:{})}});
   return {error:f.blocked?blockedMessage:f.restart?'سه بار کد اشتباه وارد شد؛ دوباره شماره را وارد کنید.':'کد واردشده غلط است.',restart:f.restart||f.blocked};
  }
  // Match legacy Iranian formats, but never merge multiple accounts automatically.
  const national=row.phone.slice(1);
  const existing=await tx.user.findMany({where:{phone:{in:[row.phone,`+98${national}`,`98${national}`,`0098${national}`]}},take:2});
  if(existing.length>1)return {error:'برای بررسی حساب‌های این شماره با پشتیبانی تماس بگیرید.',restart:true};
  if(existing[0]?.demoBatchId&&process.env.NODE_ENV==='production')return {error:'حساب آزمایشی قابل ورود نیست.',restart:true};
  const user=existing[0]??await tx.user.create({data:{phone:row.phone,role:'STUDENT'}});
  await tx.loginOtp.update({where:{phone:row.phone},data:{digest:null,challengeId:null,expiresAt:null,attempts:0,consecutiveFailures:0}});
  return {user:{id:user.id,role:user.role}};
 });
}
