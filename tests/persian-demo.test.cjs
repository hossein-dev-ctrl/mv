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


const {faDigits,latinDigits,numberWords}=load('lib/persian-numbers.ts');
test('Persian and Arabic digits normalize without changing letters',()=>{
 assert.equal(latinDigits('۱۲۳٬٤٥٦'),'123456');assert.equal(faDigits('IR123'),'IR۱۲۳');
});
test('Persian number words handle zero, groups, signs and invalid input',()=>{
 for(const [input,expected] of [[0,'صفر'],[21,'بیست و یک'],[101,'صد و یک'],['۱٬۲۰۰٬۰۰۰','یک میلیون و دویست هزار'],[2000000000,'دو میلیارد'],[-10,'منفی ده'],['',''],[1.5,'']])assert.equal(numberWords(input),expected);
});
const {coursePrice}=load('lib/course-price.ts');
test('discount calculation is integer toman and supports free courses',()=>{
 assert.equal(coursePrice({price:101,discountPercent:25}),75);assert.equal(coursePrice({price:100,discountPercent:100}),0);assert.equal(coursePrice({price:100}),100);
 for(const discountPercent of [-1,101,0.5,NaN])assert.throws(()=>coursePrice({price:100,discountPercent}));
});
test('numeric input shows Persian digits, words and canonical submitted value',()=>{
 const Input=load('components/ui/number-input.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Input,{name:'minimum',defaultValue:120000,unit:'تومان'}));
 assert.match(html,/value="۱۲۰۰۰۰"/);assert.match(html,/name="minimum" value="120000"/);assert.match(html,/صد و بیست هزار تومان/);
});
test('Jalali chart changes year at Tehran Nowruz and spans previous year',()=>{
 const {recentPersianMonths,persianMonthKey}=load('lib/persian-months.ts');
 assert.equal(persianMonthKey(new Date('2025-03-20T12:00:00Z')),1403*12+11);
 const months=recentPersianMonths(new Date('2025-03-21T12:00:00Z'));
 assert.equal(months.at(-1).label,'فروردین ۱۴۰۴');assert.equal(months.at(-2).label,'اسفند ۱۴۰۳');assert.equal(months.length,6);
});
test('payment creation uses server discount and pending amount, ignores submitted amount',async()=>{
 let gatewayAmount;
 const {POST}=load('app/api/payments/create/route.ts',{
  '@/lib/auth':{getSession:async()=>({userId:'student'})},
  '@/lib/prisma':{prisma:{course:{findUnique:async()=>({id:'c',price:1000,discountPercent:25,teacherId:'teacher',status:'PUBLISHED'})},enrollment:{findUnique:async()=>null},payment:{findFirst:async({where})=>{assert.equal(where.amount,750);return null;},create:async({data})=>{assert.equal(data.amount,750);return {id:'p',...data};},update:async()=>({})},user:{findUnique:async()=>null}}},
  '@/lib/zarinpal':{requestPayment:async({amount})=>{gatewayAmount=amount;return {data:{code:100,authority:'a'}};},getPaymentUrl:()=>'/gateway'}
 });
 const res=await POST(new Request('http://test/api',{method:'POST',body:JSON.stringify({courseId:'c',amount:1})}));assert.equal(res.status,200);assert.equal(gatewayAmount,750);
});
function demo(tx){return load('lib/finance-demo.ts',{'@/lib/prisma':{prisma:{$transaction:fn=>fn(tx)}}});}
test('demo cannot create or delete data in production',async()=>{
 const before=process.env.NODE_ENV;process.env.NODE_ENV='production';try {
 const service=demo({});await assert.rejects(service.createFinanceDemo('admin'),/توسعه/);await assert.rejects(service.clearFinanceDemo('admin'),/توسعه/);
 }finally{process.env.NODE_ENV=before;}
});
test('demo cleanup refuses outside dependencies before any deletion',async()=>{
 const before=process.env.NODE_ENV;process.env.NODE_ENV='development';try {
 const tx={$queryRaw:async()=>[],demoBatch:{findUnique:async()=>({id:'batch',teacherId:'t'})},user:{findMany:async()=>[{id:'t'}]},course:{findMany:async()=>[{id:'c',teacherId:'t'}],count:async()=>1},payment:{count:async()=>0},enrollment:{count:async()=>0}};
 await assert.rejects(demo(tx).clearFinanceDemo('admin'),/خارج از تست/);
 }finally{process.env.NODE_ENV=before;}
});
test('demo cleanup scopes every deletion and keeps the global minimum',async()=>{
 const before=process.env.NODE_ENV;process.env.NODE_ENV='development';try {
 const calls={};const remove=name=>async q=>{calls[name]=q.where;};
 const tx={$queryRaw:async()=>[],demoBatch:{findUnique:async()=>({id:'batch',teacherId:'t'}),delete:remove('batch')},user:{findMany:async()=>[{id:'t'},{id:'s'}],deleteMany:remove('users')},course:{findMany:async()=>[{id:'c',teacherId:'t'}],count:async()=>0,deleteMany:remove('courses')},payment:{count:async()=>0,findMany:async()=>[{id:'p'}],deleteMany:remove('payments')},enrollment:{count:async()=>0,deleteMany:remove('enrollments')},paymentRefund:{deleteMany:remove('refunds')},paymentCost:{deleteMany:remove('costs')},payout:{deleteMany:remove('payouts')}};
 await demo(tx).clearFinanceDemo('admin');assert.deepEqual(calls.payments,{id:{in:['p']}});assert.equal(calls.users.demoBatchId,'batch');assert.deepEqual(calls.payouts,{teacherId:{in:['t','s']}});assert.deepEqual(calls.batch,{id:'batch'});
 }finally{process.env.NODE_ENV=before;}
});
test('users page denies non-admin before reading accounts',async()=>{
 const Page=load('app/admin/users/page.tsx',{'@/lib/finance':{requireFinanceUser:async(admin)=>{assert.equal(admin,true);throw Error('denied');}},'@/lib/prisma':{prisma:{}},'next/link':{default:()=>null}}).default;
 await assert.rejects(Page({searchParams:Promise.resolve({})}),/denied/);
});
