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

const {calculateTeacherShare,summarizeFinance}=load('lib/finance-math.ts');
test('share rounds down in toman and preserves unspecified policy',()=>{
 assert.equal(calculateTeacherShare(101,70),70);
 assert.equal(calculateTeacherShare(101,0),0);
 assert.equal(calculateTeacherShare(101,100),101);
 assert.equal(calculateTeacherShare(101,null),null);
 for(const value of [-1,101,1.5,NaN])assert.throws(()=>calculateTeacherShare(100,value));
});
test('finance excludes self enrollment, failed payments, mock and unknown legacy money',()=>{
 const base={userId:'student',status:'SUCCESS',amount:100,isTest:false,transactionId:'real',teacherShareAmount:70};
 const total=summarizeFinance('teacher',[{userId:'teacher',status:'ACTIVE'},{userId:'student',status:'ACTIVE'},{userId:'other',status:'CANCELLED'}],[base,{...base,userId:'teacher'},{...base,status:'FAILED'},{...base,isTest:true},{...base,transactionId:'MOCK-old'},{...base,isTest:null},{...base,teacherShareAmount:null}]);
 assert.equal(total.registrations,2);assert.equal(total.active,1);assert.equal(total.cancelled,1);
 assert.equal(total.sales,200);assert.equal(total.teacherShare,70);assert.equal(total.platformShare,30);
 assert.equal(total.unallocated,100);assert.equal(total.testPayments,2);assert.equal(total.unknownPayments,1);
});
function finalizer({owner=false,success=false,claimed=1,percent=70}={}) {
 const calls=[];
 const tx={payment:{findUnique:async()=>({id:'p',userId:owner?'teacher':'student',courseId:'c',amount:101,isTest:false,status:success?'SUCCESS':'PENDING',course:{teacherId:'teacher',teacher:{teacherSharePercent:percent}}}),updateMany:async query=>{calls.push(query);return {count:claimed};}},enrollment:{findUnique:async()=>({id:'enrollment',status:'COMPLETED'}),upsert:()=>assert.fail('must preserve completed enrollment')},lesson:{findMany:async()=>[]}};
 return {calls,run:load('lib/finalize-payment.ts',{'@/lib/prisma':{prisma:{$transaction:fn=>fn(tx)}}}).finalizePayment};
}
test('finalization rejects own-course payment before writes',async()=>{
 const {calls,run}=finalizer({owner:true});await assert.rejects(run('p','txn'),/مدرس/);assert.equal(calls.length,0);
});
test('successful payment stores immutable share and keeps completed learning',async()=>{
 const {calls,run}=finalizer();assert.deepEqual(await run('p','txn'),{newlyCompleted:true});
 assert.equal(calls[0].data.teacherSharePercent,70);assert.equal(calls[0].data.teacherShareAmount,70);
 assert.deepEqual(calls[0].where,{id:'p',status:{not:'SUCCESS'}});
});
test('replayed callback never recalculates share',async()=>{
 const {calls,run}=finalizer({success:true,percent:90});assert.deepEqual(await run('p','txn'),{newlyCompleted:false});assert.equal(calls.length,0);
});
test('lost concurrent claim skips enrollment writes',async()=>{
 const {run}=finalizer({claimed:0});assert.deepEqual(await run('p','txn'),{newlyCompleted:false});
});
test('no configured percentage stays unallocated and mock stays identifiable',async()=>{
 const {calls,run}=finalizer({percent:null});await run('p','MOCK-p',true);
 assert.equal(calls[0].data.teacherShareAmount,null);assert.equal(calls[0].data.isTest,true);
});
function adminRoute({role='ADMIN',dbRole=role,tx}={}) {
 return load('app/api/admin/teachers/[teacherId]/share/route.ts',{
  '@/lib/auth':{getSession:async()=>({userId:'actor',role})},
  '@/lib/prisma':{prisma:{user:{findUnique:async({where})=>({role:where.id==='actor'?dbRole:'TEACHER'})},$transaction:fn=>fn(tx)}},
 }).PATCH;
}
const req=body=>new Request('http://test.local/api',{method:'PATCH',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}});
for(const [role,dbRole] of [['TEACHER','TEACHER'],['ADMIN','TEACHER'],['STUDENT','ADMIN']])test('share editing denies '+role+'/'+dbRole,async()=>{
 const response=await adminRoute({role,dbRole})(req({percent:70,applyUnallocated:false}),{params:Promise.resolve({teacherId:'teacher'})});assert.equal(response.status,403);
});
test('share API rejects invalid amounts before writing',async()=>{
 for(const percent of [-1,101,0.5,'70',null]){
 const response=await adminRoute()(req({percent,applyUnallocated:false}),{params:Promise.resolve({teacherId:'teacher'})});assert.equal(response.status,400);
 }
});
test('admin percentage changes do not overwrite previously allocated payments',async()=>{
 let updated=false;
 const tx={user:{update:async({data})=>{assert.equal(data.teacherSharePercent,75);}},payment:{findMany:async({where})=>{assert.equal(where.teacherShareAmount,null);assert.equal(where.isTest,false);assert.equal(where.course.teacherId,'teacher');assert.equal(where.userId.not,'teacher');return [{id:'p',amount:101}];},updateMany:async({where,data})=>{assert.equal(where.teacherShareAmount,null);assert.equal(data.teacherShareAmount,75);updated=true;return {count:1};}}};
 const response=await adminRoute({tx})(req({percent:75,applyUnallocated:true}),{params:Promise.resolve({teacherId:'teacher'})});assert.equal(response.status,200);assert.equal(updated,true);
});
test('without opt-in historical payments are untouched',async()=>{
 const tx={user:{update:async()=>({})},payment:{findMany:()=>assert.fail('no historical rewrite')}};
 const response=await adminRoute({tx})(req({percent:0,applyUnallocated:false}),{params:Promise.resolve({teacherId:'teacher'})});assert.equal(response.status,200);
});
test('mock endpoint cannot enroll owner with old pending payment',async()=>{
 const {POST}=load('app/api/payments/mock/verify/route.ts',{
  '@/lib/auth':{getSession:async()=>({userId:'teacher'})},
  '@/lib/prisma':{prisma:{payment:{findUnique:async()=>({id:'p',userId:'teacher',course:{teacherId:'teacher'}})}}},
  '@/lib/finalize-payment':{finalizePayment:()=>assert.fail('must not enroll')},
 });
 const response=await POST(req({paymentId:'p',success:true}));assert.equal(response.status,403);
});
test('gateway callback rejects owner before verify',async()=>{
 const {GET}=load('app/api/payments/zarinpal/callback/route.ts',{
  '@/lib/prisma':{prisma:{payment:{findUnique:async()=>({id:'p',userId:'teacher',status:'PENDING',course:{teacherId:'teacher'}})}}},
  '@/lib/zarinpal':{verifyPayment:()=>assert.fail('no self purchase')},
  '@/lib/finalize-payment':{finalizePayment:()=>assert.fail('no enrollment')},
  '@/lib/sms':{},
 });
 const response=await GET(new Request('http://test.local/callback?Authority=a&Status=OK'));assert.match(response.headers.get('location'),/own_course/);
});
test('finance data scopes courses to requested teacher',async()=>{
 const {getFinanceCourses}=load('lib/finance.ts',{
 'next/navigation':{},'@/lib/auth':{},'@/lib/prisma':{prisma:{course:{findMany:async({where})=>{assert.deepEqual(where,{teacherId:'teacher'});return [];}}}},
 });
 assert.deepEqual(await getFinanceCourses('teacher'),[]);
});
