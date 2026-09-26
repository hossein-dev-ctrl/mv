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


const link = {default:({href,children,...props})=>React.createElement('a',{href,...props},children)};
async function shell({role='STUDENT',sessionRole=role,name='سارا احمدی',email=null,phone=null,area='student',session=true,exists=true}={}) {
  const {default: Shell}=load('components/panel/panel-shell.tsx',{
    'next/link':link,
    'next/navigation':{usePathname:()=>area==='teacher'?'/teacher':area==='admin'?'/admin':'/dashboard',redirect:(url)=>{throw new Error('REDIRECT '+url);}},
    '@/lib/auth':{getSession:async()=>session?{userId:'user',role:sessionRole}:null},
    '@/lib/prisma':{prisma:{user:{findUnique:async(query)=>{
      assert.equal(query.where.id,'user');
      assert.equal(query.select.passwordHash,undefined);
      return exists?{name,email,phone,role}:null;
    }}}},
  });
  return renderToStaticMarkup(await Shell({area,children:React.createElement('main',null,'محتوای پنل')}));
}
for(const [role,label] of [['STUDENT','دانش‌آموز'],['TEACHER','مدرس'],['ADMIN','مدیر']]) {
 test('header and footer reflect '+role,async()=>{
  const html=await shell({role});
  assert.match(html,/<header/); assert.match(html,/<footer/);
  assert.match(html,/سارا احمدی/); assert.ok(html.includes('سطح دسترسی: '+label));
  assert.equal((html.match(/خروج از حساب/g)||[]).length,1);
  assert.equal(html.includes('href="/teacher"'),role==='TEACHER');
  assert.equal(html.includes('href="/admin"'),role==='ADMIN');
  assert.match(html,/<main>محتوای پنل/);
 });
}
test('student cannot render teacher shell',async()=>{
 await assert.rejects(shell({area:'teacher'}),/REDIRECT \/dashboard/);
});
test('teacher cannot render admin shell',async()=>{
 await assert.rejects(shell({role:'TEACHER',area:'admin'}),/REDIRECT \/dashboard/);
});
test('anonymous user is redirected to login',async()=>{
 await assert.rejects(shell({session:false}),/REDIRECT \/login/);
});
test('deleted user is redirected to login',async()=>{
 await assert.rejects(shell({exists:false}),/REDIRECT \/login/);
});
test('changed role requires a fresh login',async()=>{
 await assert.rejects(shell({role:'STUDENT',sessionRole:'ADMIN'}),/REDIRECT \/login/);
});
test('missing name falls back to isolated contact text',async()=>{
 const html=await shell({name:'  ',email:'student@example.test'});
 assert.match(html,/<bdi>student@example.test<\/bdi>/);
});
test('lesson view keeps actual role and identifies learning area',async()=>{
 const html=await shell({role:'TEACHER',area:'lesson'});
 assert.match(html,/سطح دسترسی: مدرس/); assert.match(html,/بخش فعلی: محیط یادگیری/);
});
for (const succeeds of [true,false]) test('logout '+(succeeds?'navigates after success':'stays on page after failure'),async()=>{
 const oldFetch=global.fetch, oldWindow=global.window;
 let target=null; const states=[];
 global.fetch=async(url,options)=>{assert.equal(url,'/api/auth/logout');assert.equal(options.method,'POST');return {ok:succeeds};};
 global.window={location:{replace:(url)=>{target=url;}}};
 try {
  const {default: Logout}=load('components/logout-button.tsx',{'react':{useState:(initial)=>[initial,(value)=>states.push(value)]}});
  const tree=Logout();
  const button=tree.props.children[0];
  await button.props.onClick();
  assert.equal(target,succeeds?'/login':null);
  if(!succeeds) assert.ok(states.some(value=>typeof value==='string'&&value.includes('خروج انجام نشد')));
 } finally {global.fetch=oldFetch;global.window=oldWindow;}
});

test('public courses shell allows guests with one header and footer', async () => {
  const html = await shell({session:false, area:'courses'});
  assert.equal((html.match(/<header/g)||[]).length,1);
  assert.equal((html.match(/<footer/g)||[]).length,1);
  assert.match(html,/href="\/login"/);
  assert.doesNotMatch(html,/خروج از حساب|href="\/dashboard"/);
});
test('teacher navigation separates management from enrolled learning', async () => {
  const html = await shell({role:'TEACHER',area:'courses'});
  assert.match(html,/مدیریت دوره‌های من/);
  assert.match(html,/دوره‌های ثبت‌نام‌شده/);
});
for (const file of ['app/api/enrollments/route.ts','app/api/payments/create/route.ts']) {
  test(file+' blocks own-course enrollment before any payment or writes',async()=>{
    const {POST}=load(file,{
      '@/lib/auth':{getSession:async()=>({userId:'owner',role:'TEACHER'})},
      '@/lib/prisma':{prisma:{course:{findUnique:async()=>({id:'course',teacherId:'owner',status:'PUBLISHED',price:100})}}},
      '@/lib/zarinpal':{requestPayment:()=>assert.fail('must not request payment')},
    });
    const response=await POST(new Request('http://test.local/api',{method:'POST',body:JSON.stringify({courseId:'course'})}));
    assert.equal(response.status,403);
  });
}
for (const owner of [true,false]) test('course detail '+(owner?'offers management without checkout':'allows another teacher to enroll'),async()=>{
 const {default:Page}=load('app/courses/[slug]/page.tsx',{
  'next/link':link,
  'next/navigation':{notFound:()=>assert.fail('unexpected 404')},
  '@/lib/auth':{getSession:async()=>({userId:owner?'owner':'other',role:'TEACHER'})},
  '@/lib/prisma':{prisma:{course:{findUnique:async()=>({id:'c1',slug:'dore',teacherId:'owner',title:'نمونه',teacher:{name:'مدرس'},status:'PUBLISHED',price:100,sections:[]})},enrollment:{findUnique:async()=>null}}},
 });
 const html=renderToStaticMarkup(await Page({params:Promise.resolve({slug:'dore'})}));
 assert.equal(html.includes('href="/teacher/courses/c1"'),owner);
 assert.equal(html.includes('href="/courses/dore/checkout"'),!owner);
 assert.match(html,/بازگشت به همهٔ دوره‌ها/);
});
test('catalog queries published courses and handles empty results',async()=>{
 const {default:Page}=load('app/courses/page.tsx',{
  'next/link':link,
  '@/lib/auth':{getSession:async()=>null},
  '@/lib/prisma':{prisma:{course:{findMany:async(query)=>{assert.equal(query.where.status,'PUBLISHED');return [];}}}},
 });
 const html=renderToStaticMarkup(await Page());
 assert.match(html,/هنوز دوره‌ای منتشر نشده است/);
 assert.doesNotMatch(html,/تست ارسال پیامک/);
});
