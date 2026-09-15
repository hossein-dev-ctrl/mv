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

const link={default:({href,children,...props})=>React.createElement('a',{href,...props},children)};
function mocks(payment={},session={userId:'viewer',role:'STUDENT'}) {
 return {'next/link':link,'next/navigation':{redirect:url=>{throw new Error('REDIRECT '+url);}},'@/lib/auth':{getSession:async()=>session},'@/lib/prisma':{prisma:{payment}}};
}
const row={id:'p1',amount:250000,status:'SUCCESS',transactionId:'txn-123',createdAt:new Date('2026-09-10T10:00:00Z'),paidAt:new Date('2026-09-10T10:05:00Z'),course:{title:'دوره نمونه',slug:'dore',status:'PUBLISHED'}};
test('guest cannot query payment history',async()=>{
 const {default:Page}=load('app/payments/page.tsx',mocks({count:()=>assert.fail('no DB read')},null));
 await assert.rejects(Page({searchParams:Promise.resolve({})}),/REDIRECT \/login/);
});
test('history scopes both count and list to signed-in user and preserves filter across pages',async()=>{
 const {default:Page}=load('app/payments/page.tsx',mocks({
 count:async({where})=>{assert.deepEqual(where,{userId:'viewer',status:'SUCCESS'});return 42;},
 findMany:async query=>{assert.deepEqual(query.where,{userId:'viewer',status:'SUCCESS'});assert.equal(query.take,20);assert.equal(query.skip,20);return [row];},
 }));
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({status:'SUCCESS',page:'2'})}));
 assert.match(html,/txn-123/);assert.match(html,/paymentId=p1/);assert.match(html,/page=3&amp;status=SUCCESS/);
});
for(const status of ['PENDING','FAILED','CANCELLED']) test(status+' never links to successful receipt',async()=>{
 const {default:Page}=load('app/payments/page.tsx',mocks({count:async()=>1,findMany:async()=>[{...row,status}]}));
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({})}));
 assert.doesNotMatch(html,/payment\/success|txn-123/);
 if(status==='PENDING')assert.match(html,/تأیید نهایی این پرداخت هنوز ثبت نشده است/);
});
for(const status of ['PENDING','FAILED','CANCELLED']) test('success URL rejects '+status,async()=>{
 const {default:Page}=load('app/payment/success/page.tsx',mocks({findFirst:async query=>{assert.deepEqual(query.where,{id:'p1',userId:'viewer'});return {...row,status};}}));
 await assert.rejects(Page({searchParams:Promise.resolve({paymentId:'p1'})}),/REDIRECT \/payments/);
});
test('success receipt rejects another users payment',async()=>{
 const {default:Page}=load('app/payment/success/page.tsx',mocks({findFirst:async()=>null}));
 await assert.rejects(Page({searchParams:Promise.resolve({paymentId:'other'})}),/REDIRECT \/payments/);
});
test('confirmed receipt renders transaction and back link',async()=>{
 const {default:Page}=load('app/payment/success/page.tsx',mocks({findFirst:async()=>row}));
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({paymentId:'p1'})}));
 assert.match(html,/پرداخت موفق بود/);assert.match(html,/txn-123/);assert.match(html,/بازگشت به سوابق پرداخت/);
});
test('history handles invalid filters and page values safely',async()=>{
 for(const query of [{status:'toString',page:'Infinity'},{status:['SUCCESS'],page:'-1'},{status:'BAD',page:'1.5'}]){
  const {default:Page}=load('app/payments/page.tsx',mocks({count:async({where})=>{assert.deepEqual(where,{userId:'viewer'});return 0;},findMany:async({skip})=>{assert.equal(skip,0);return [];}}));
  const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve(query)}));
  assert.match(html,/هنوز پرداختی در حساب شما ثبت نشده است/);
 }
});
test('history clamps excessive pages and keeps archived-course payment records',async()=>{
 const {default:Page}=load('app/payments/page.tsx',mocks({count:async()=>21,findMany:async({skip})=>{assert.equal(skip,20);return [{...row,course:{...row.course,status:'ARCHIVED'}}];}}));
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({page:'999999'})}));
 assert.match(html,/دوره در حال حاضر منتشر نیست/);assert.doesNotMatch(html,/href="\/courses\/dore"/);
});
