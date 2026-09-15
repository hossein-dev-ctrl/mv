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


const link = {default:({href,children,...props})=>React.createElement('a',{href,...props},children)};
async function shell({role='STUDENT',sessionRole=role,name='سارا احمدی',email=null,phone=null,area='student',session=true,exists=true}={}) {
  const {default: Shell}=load('components/panel/panel-shell.tsx',{
    'next/link':link,
    'next/navigation':{redirect:(url)=>{throw new Error('REDIRECT '+url);}},
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
  assert.equal(html.includes('href="/teacher"'),role!=='STUDENT');
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
