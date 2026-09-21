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

const {walletTotals,validIban}=load('lib/wallet-math.ts');
const {panelNavigation,activeNavigation}=load('lib/panel-navigation.ts');
const sale={amount:1000,teacherShareAmount:700,refund:null,cost:{amount:20}};
test('wallet subtracts paid and both kinds of reservation, without deducting transfer fee twice',()=>{
 const total=walletTotals([sale],[{amount:200,fee:10,status:'PAID'},{amount:100,fee:0,status:'PROCESSING'},{amount:50,fee:0,status:'REJECTED'}]);
 assert.equal(total.available,400);assert.equal(total.received,190);assert.equal(total.paid,200);assert.equal(total.platformNet,280);
});
test('refund after payout creates carried debt instead of resetting paid history',()=>{
 const total=walletTotals([{...sale,refund:{amount:1000,teacherDebit:700}}],[{amount:700,fee:0,status:'PAID'}]);
 assert.equal(total.available,-700);assert.equal(total.platformNet,-20);assert.equal(total.paid,700);
});
test('unknown share is never made withdrawable',()=>{
 const total=walletTotals([{...sale,teacherShareAmount:null}],[]);assert.equal(total.available,0);assert.equal(total.unallocated,1000);assert.equal(total.platformNet,-20);
});
test('admin navigation has no personal teaching, enrollment or payment tabs',()=>{
 const items=panelNavigation('ADMIN');assert.deepEqual(items.map(x=>x.href),['/admin','/admin/courses','/admin/users','/admin/finance','/admin/settlements','/tickets','/admin/notifications']);
});
for(const [role,path,active] of [['TEACHER','/teacher/finance','/teacher/finance'],['TEACHER','/teacher/courses/c','/teacher'],['ADMIN','/admin/finance','/admin/finance'],['ADMIN','/teacher/courses/c/students/e','/admin/courses'],['STUDENT','/payment/success','/payments']])test('most specific active tab for '+path,()=>{
 assert.equal(activeNavigation(path,panelNavigation(role),role),active);
});
test('IBAN validation rejects wrong check digits and accepts valid checksum',()=>{
 assert.equal(validIban('IR062960000000100324200001'),true);assert.equal(validIban('IR002960000000100324200001'),false);assert.equal(validIban('oops'),false);
});
const teacher={id:'teacher',role:'TEACHER'},admin={id:'admin',role:'ADMIN'};
const payout={id:'p',teacherId:'teacher',amount:500,fee:0,status:'REQUESTED',requestedAt:new Date('2026-01-01'),processedBy:null};
function service(overrides={}) {
 const events=[];
 const tx={
  user:{findMany:async()=>[{id:"admin"}]},notification:{createMany:async()=>({count:1})},
  $queryRaw:async()=>{events.push('lock');return [{id:'teacher'}];},
  financeSettings:{findUnique:async()=>({minimumPayout:100})},
  payment:{findMany:async()=>[sale]},
  payout:{findMany:async()=>[],create:async({data})=>{events.push(data);return data;}},
  ...overrides,
 };
 return {events,tx,...load('lib/settlement-service.ts',{'@/lib/prisma':{prisma:{$transaction:fn=>fn(tx)}}})};
}
const request={action:'request',amount:500,iban:'IR062960000000100324200001',accountName:'نام آزمایشی'};
test('request reserves verified balance after teacher lock',async()=>{
 const {executeSettlement,events}=service();await executeSettlement(teacher,request);assert.equal(events[0],'lock');assert.equal(events[1].teacherId,'teacher');assert.equal(events[1].amount,500);
});
test('requests below minimum, above balance or while open are blocked',async()=>{
 for(const amount of [99,701])await assert.rejects(service().executeSettlement(teacher,{...request,amount}));
 await assert.rejects(service({payout:{findMany:async()=>[payout]}}).executeSettlement(teacher,request));
 await assert.rejects(service({financeSettings:{findUnique:async()=>null}}).executeSettlement(teacher,request));
});
test('only designated roles can execute ledger operations',async()=>{
 await assert.rejects(service().executeSettlement(admin,request),/نقش/);
 await assert.rejects(service().executeSettlement(teacher,{action:'settings',minimum:100}),/نقش/);
});
test('second admin cannot complete a claimed payout',async()=>{
 const target={...payout,status:'PROCESSING',processedBy:'other-admin'};
 const svc=service({payout:{findUnique:async()=>target,findUniqueOrThrow:async()=>target}});
 await assert.rejects(svc.executeSettlement(admin,{action:'pay',id:'p',fee:0,reference:'r123',paidAt:'2026-09-01T12:00:00Z'}),/مدیر دیگری/);
});
test('completed payouts cannot be paid again',async()=>{
 const target={...payout,status:'PAID'};
 const svc=service({payout:{findUnique:async()=>target,findUniqueOrThrow:async()=>target}});
 await assert.rejects(svc.executeSettlement(admin,{action:'pay',id:'p',fee:0,reference:'r123',paidAt:'2026-09-01T12:00:00Z'}),/قبلاً/);
});
test('acknowledgment is own-only and does not alter amount or paid status',async()=>{
 let data;
 const target={...payout,status:'PAID'};
 const svc=service({payout:{findUnique:async()=>target,findUniqueOrThrow:async()=>target,updateMany:async query=>{data=query;}}});
 await assert.rejects(svc.executeSettlement({id:'other',role:'TEACHER'},{action:'receive',id:'p'}),/پیدا نشد/);
 await svc.executeSettlement(teacher,{action:'receive',id:'p'});
 assert.deepEqual(Object.keys(data.data),['receivedAt']);assert.equal(data.where.receivedAt,null);
});
test('full refund reverses frozen share and releases pending requests',async()=>{
 let refund,cancelled=false,released=false;
 const payment={id:'sale',userId:'student',courseId:'c',amount:1000,teacherShareAmount:700,status:'SUCCESS',isTest:false,transactionId:'real',paidAt:new Date('2026-01-01'),refund:null,course:{teacherId:'teacher'}};
 const svc=service({payment:{findUnique:async()=>payment,findUniqueOrThrow:async()=>payment,count:async()=>0},payout:{count:async()=>0,updateMany:async({where,data})=>{assert.equal(where.status,'REQUESTED');assert.equal(data.status,'REJECTED');released=true;}},paymentRefund:{create:async({data})=>{refund=data;}},enrollment:{updateMany:async({data})=>{cancelled=data.status==='CANCELLED';}}});
 await svc.executeSettlement(admin,{action:'refund',paymentId:'sale',reference:'refund1',reason:'لغو دوره',refundedAt:'2026-09-01T12:00:00Z'});
 assert.equal(refund.teacherDebit,700);assert.equal(refund.amount,1000);assert.ok(cancelled&&released);
});
test('invalid money and future payment dates fail input validation',()=>{
 const {settlementInput}=service();
 assert.equal(settlementInput.safeParse({action:'settings',minimum:0}).success,false);
 assert.equal(settlementInput.safeParse({action:'settings',minimum:100.5}).success,false);
 assert.equal(settlementInput.safeParse({action:'pay',id:'p',fee:0,reference:'ref',paidAt:'2999-01-01T00:00:00Z'}).success,false);
});
test('admin claims then records only the reserved gross amount and explicit fee',async()=>{
 let current={...payout};
 const db={findUnique:async()=>current,findUniqueOrThrow:async()=>current,findMany:async()=>[current],update:async({data})=>{current={...current,...data};return current;}};
 const svc=service({payout:db});
 await svc.executeSettlement(admin,{action:'begin',id:'p'});assert.equal(current.status,'PROCESSING');assert.equal(current.processedBy,'admin');
 await svc.executeSettlement(admin,{action:'pay',id:'p',fee:10,reference:'bank123',paidAt:'2026-09-01T12:00:00Z'});
 assert.equal(current.status,'PAID');assert.equal(current.amount,500);assert.equal(current.fee,10);
 const total=walletTotals([sale],[current]);assert.equal(total.available,200);assert.equal(total.received,490);
});
test('refund cannot interfere with an in-flight bank transfer',async()=>{
 const payment={id:'sale',userId:'student',amount:1000,status:'SUCCESS',isTest:false,transactionId:'real',refund:null,paidAt:new Date('2026-01-01'),course:{teacherId:'teacher'}};
 const svc=service({payment:{findUnique:async()=>payment,findUniqueOrThrow:async()=>payment},payout:{count:async()=>1},paymentRefund:{create:()=>assert.fail('do not change ledger')}});
 await assert.rejects(svc.executeSettlement(admin,{action:'refund',paymentId:'sale',reference:'r123',reason:'برگشت',refundedAt:'2026-09-01T12:00:00Z'}),/واریز در حال انجام/);
});
test('recorded refund cannot be recorded again',async()=>{
 const payment={id:'sale',userId:'student',amount:1000,status:'SUCCESS',isTest:false,refund:{id:'old'},course:{teacherId:'teacher'}};
 const svc=service({payment:{findUnique:async()=>payment,findUniqueOrThrow:async()=>payment}});
 await assert.rejects(svc.executeSettlement(admin,{action:'refund',paymentId:'sale',reference:'r123',reason:'برگشت',refundedAt:'2026-09-01T12:00:00Z'}),/قبلاً بازپرداخت/);
});
