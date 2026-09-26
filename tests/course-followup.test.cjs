const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Load the real TypeScript handlers/components with isolated boundary doubles.
// These tests require no credentials and never contact a real database.
function load(file, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} };
  const resolve = (name) => {
    if (name in mocks) return mocks[name];
    if (['@/components/assessment/exam-gateway','@/components/assessment/final-report'].includes(name)) return {default:()=>null};
    if (name.startsWith('@/')) {
      const base = name.slice(2);
      const ext = fs.existsSync(path.join(__dirname, '..', `${base}.tsx`)) ? '.tsx' : '.ts';
      return load(base + ext, mocks);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', outputText)(resolve, module, module.exports);
  return module.exports;
}


const {jalaliDays,jalaliToIso,jalaliParts}=load('lib/jalali-date.ts');
test('Jalali leap Esfand, Nowruz and Tehran date conversion',()=>{
 assert.equal(jalaliDays(1403,12),30);assert.equal(jalaliDays(1404,12),29);
 assert.equal(jalaliToIso(1404,1,1,10,30),'2025-03-21T07:00:00.000Z');
 assert.deepEqual(jalaliParts(new Date(jalaliToIso(1403,12,30,23,59))),{year:1403,month:12,day:30});
 assert.throws(()=>jalaliToIso(1404,12,30,10,0));assert.throws(()=>jalaliToIso(1404,1,0,10,0));assert.throws(()=>jalaliToIso(1404,1,1,24,0));
});
test('Jalali conversion honors historical Tehran daylight offset',()=>{
 assert.equal(jalaliToIso(1400,4,1,12,0),'2021-06-22T07:30:00.000Z');
});
function interest({role='STUDENT',owner=false,status='UPCOMING',published=true}={}) {
 let saved;
 const {POST}=load('app/api/courses/[courseId]/interest/route.ts',{
 '@/lib/auth':{getSession:async()=>({userId:'u',role})},
 '@/lib/prisma':{prisma:{$transaction:async function(fn){return fn(this);},notification:{createMany:async()=>({count:1})},user:{findMany:async()=>[{id:'admin'}],findUnique:async()=>({id:'u',role})},course:{findUnique:async()=>({teacherId:owner?'u':'t',status:published?'PUBLISHED':'DRAFT',deliveryStatus:status})},courseInterest:{upsert:async q=>{saved=q;return {id:"interest"};}}}}
 });
 return {run:body=>POST(new Request('http://test/api',{method:'POST',body:JSON.stringify(body)}),{params:Promise.resolve({courseId:'c'})}),saved:()=>saved};
}
const person={name:'نام آزمایشی',phone:'۰۹۱۲۳۴۵۶۷۸۹',consent:true};
test('interest captures normalized contact and deduplicates by account and course',async()=>{
 const service=interest();assert.equal((await service.run(person)).status,200);assert.equal(service.saved().create.phone,'09123456789');assert.deepEqual(service.saved().where,{courseId_userId:{courseId:'c',userId:'u'}});assert.deepEqual(service.saved().update,{});
});
for(const options of [{role:'ADMIN'},{owner:true},{status:'ONGOING'},{published:false}])test('interest refuses non-applicant or unavailable course '+JSON.stringify(options),async()=>{
 const service=interest(options);assert.ok((await service.run(person)).status>=400);assert.equal(service.saved(),undefined);
});
test('interest requires consent and a valid contact',async()=>{
 for(const data of [{...person,consent:false},{...person,phone:'123'}])assert.equal((await interest().run(data)).status,400);
});
for(const file of ['app/api/enrollments/route.ts','app/api/payments/create/route.ts'])test('upcoming courses cannot be bought or enrolled through '+file,async()=>{
 const {POST}=load(file,{'@/lib/auth':{getSession:async()=>({userId:'s'})},'@/lib/prisma':{prisma:{course:{findUnique:async()=>({teacherId:'t',status:'PUBLISHED',deliveryStatus:'UPCOMING'})}}},'@/lib/zarinpal':{requestPayment:()=>assert.fail('must not contact gateway')}});
 assert.equal((await POST(new Request('http://test/api',{method:'POST',body:JSON.stringify({courseId:'c'})}))).status,400);
});
function review(initial={}) {
 let row={id:'p',teacherId:'t',status:'PAID',amount:500,fee:10,reference:'bank-original',receivedAt:null,...initial};const audit=[];let locks=0;
 const tx={user:{findMany:async()=>[{id:'admin'}]},notification:{createMany:async()=>({count:1})},$queryRaw:async()=>{locks++;},payout:{findUnique:async()=>row,findUniqueOrThrow:async()=>row,update:async({data})=>{assert.ok(locks);row={...row,...data};return row;}},payoutReview:{create:async({data})=>{audit.push(data);return {id:"review",...data};}}};
 const run=load('lib/settlement-service.ts',{'@/lib/prisma':{prisma:{$transaction:fn=>fn(tx)}}}).executeSettlement;
 return {run,row:()=>row,audit};
}
const teacher={id:'t',role:'TEACHER'},admin={id:'a',role:'ADMIN'};
test('non-receipt report keeps paid balance and writes audit',async()=>{
 const s=review();await s.run(teacher,{action:'dispute',id:'p',reason:'دریافت نشده'});assert.equal(s.row().status,'PAID');assert.equal(s.row().amount,500);assert.equal(s.audit[0].actorId,'t');assert.ok(s.row().disputedAt);
});
test('admin response keeps paid status and original bank evidence',async()=>{
 const s=review({disputedAt:new Date()});await s.run(admin,{action:'review',id:'p',reason:'بانک در حال بررسی است'});assert.equal(s.row().status,'PAID');assert.equal(s.row().reference,'bank-original');assert.ok(s.row().reviewedAt);
});
test('verified failed payment reversal restores balance once and preserves audit',async()=>{
 const {walletTotals}=load('lib/wallet-math.ts');const s=review({disputedAt:new Date()});
 assert.equal(walletTotals([], [s.row()]).available,-500);
 await s.run(admin,{action:'reverse',id:'p',reason:'بانک برگشت انتقال را تأیید کرد'});
 assert.equal(walletTotals([], [s.row()]).available,0);assert.equal(s.row().reference,'bank-original');assert.equal(s.row().amount,500);assert.equal(s.audit.length,1);
 await assert.rejects(s.run(admin,{action:'reverse',id:'p',reason:'بار دوم'}));assert.equal(s.audit.length,1);
});
test('reports are own-only, reversal admin-only and acknowledged funds cannot reverse',async()=>{
 await assert.rejects(review().run({id:'other',role:'TEACHER'},{action:'dispute',id:'p',reason:'گزارش'}));
 await assert.rejects(review().run(teacher,{action:'reverse',id:'p',reason:'گزارش'}));
 await assert.rejects(review({receivedAt:new Date(),disputedAt:new Date()}).run(admin,{action:'reverse',id:'p',reason:'گزارش'}));
 await assert.rejects(review().run(admin,{action:'reverse',id:'p',reason:'بدون گزارش'}));
});
test('interest contact list refuses a different teacher before reading contacts',async()=>{
 const Page=load('app/teacher/courses/[courseId]/interests/page.tsx',{'next/link':{default:()=>null},'next/navigation':{redirect:()=>{throw Error('denied');},notFound:()=>{throw Error('denied');}},'@/lib/auth':{getSession:async()=>({userId:'other',role:'TEACHER'})},'@/lib/prisma':{prisma:{user:{findUnique:async()=>({role:'TEACHER'})},course:{findUnique:async()=>({teacherId:'owner'})}}}}).default;
 await assert.rejects(Page({params:Promise.resolve({courseId:'c'}),searchParams:Promise.resolve({})}),/denied/);
});
test('negative available balance includes an account-specific explanation',()=>{
 const {walletTotals}=load('lib/wallet-math.ts');const totals=walletTotals([{amount:500,teacherShareAmount:350,refund:{amount:500,teacherDebit:350},cost:null}],[{amount:350,fee:0,status:'PAID'}]);
 const Component=load('components/finance/wallet-summary.tsx').default;const html=renderToStaticMarkup(React.createElement(Component,{totals}));assert.match(html,/چرا مانده منفی است/);assert.match(html,/گزارش عدم دریافت/);assert.equal(totals.available,-350);
});
for(const [sessionRole,dbRole,allowed] of [['ADMIN','ADMIN',true],['ADMIN','TEACHER',false],['STUDENT','STUDENT',false]])test(`private course preview ${sessionRole}/${dbRole}`,async()=>{
 const course={id:'c',teacherId:'t',slug:'demo',status:'DRAFT',deliveryStatus:'ONGOING',title:'Private course',teacher:{name:'Teacher'},sections:[],price:0};
 const Component=load('app/courses/[slug]/page.tsx',{'next/link':{default:({children,href})=>React.createElement('a',{href},children)},'next/navigation':{notFound:()=>{throw Error('not found');}},'@/lib/auth':{getSession:async()=>({userId:'u',role:sessionRole})},'@/lib/prisma':{prisma:{course:{findUnique:async()=>course},user:{findUnique:async()=>({role:dbRole})},enrollment:{findUnique:async()=>null}}}}).default;
 if(!allowed)await assert.rejects(Component({params:Promise.resolve({slug:'demo'})}),/not found/);
 else {const html=renderToStaticMarkup(await Component({params:Promise.resolve({slug:'demo'})}));assert.match(html,/Private course/);assert.match(html,/برای کاربران عمومی قابل مشاهده نیست/);}
});
