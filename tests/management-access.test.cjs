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

const endpoints = [
 ['courses/route.ts','POST'],
 ['courses/[courseId]/route.ts','PATCH'], ['courses/[courseId]/route.ts','DELETE'],
 ['courses/[courseId]/sections/route.ts','POST'], ['courses/[courseId]/sections/route.ts','PATCH'],
 ['sections/[sectionId]/route.ts','DELETE'], ['sections/[sectionId]/lessons/route.ts','POST'],
 ['sections/[sectionId]/reorder/route.ts','POST'],
 ['lessons/[lessonId]/route.ts','PATCH'], ['lessons/[lessonId]/route.ts','DELETE'],
 ['lessons/[lessonId]/reorder/route.ts','POST'], ['lessons/[lessonId]/files/route.ts','POST'],
 ['lessons/[lessonId]/video/route.ts','POST'], ['lesson-files/[fileId]/route.ts','DELETE'],
];
function boundaries(session={userId:'teacher-a',role:'TEACHER'}, user={role:'TEACHER'}) {
 const calls=[];
 const course={id:'c',teacherId:'teacher-b',sections:[]};
 const section={id:'section',course};
 const lesson={id:'lesson',section};
 const model = record => ({findUnique:async()=>{calls.push('read');return record;}});
 return {calls,mocks:{
  '@/lib/auth':{getSession:async()=>session},
  '@/lib/prisma':{prisma:{user:{findUnique:async()=>user},course:model(course),courseSection:model(section),lesson:model(lesson),lessonFile:model({lesson})}},
 }};
}
const context={params:Promise.resolve({courseId:'c',sectionId:'section',lessonId:'lesson',fileId:'file'})};
function request(method){return new Request('https://example.com/api',{method,body:JSON.stringify({title:'عنوان دوره',slug:'sample-course',price:0,direction:'up'}),headers:{'Content-Type':'application/json'}});}
for(const [file,method] of endpoints) {
 for(const [label,session,user,status] of [
  ['guest',null,null,401],
  ['deleted account',{userId:'teacher-a',role:'TEACHER'},null,401],
  ['revoked admin cookie',{userId:'teacher-a',role:'ADMIN'},{role:'TEACHER'},401],
  ['student',{userId:'s',role:'STUDENT'},{role:'STUDENT'},403],
 ]) test(`${method} ${file} refuses ${label} before course lookup`,async()=>{
  const {mocks,calls}=boundaries(session,user);
  const response=await load('app/api/teacher/'+file,mocks)[method](request(method),context);
  assert.equal(response.status,status);assert.equal(calls.length,0);
 });
 if(file!=='courses/route.ts')test(`${method} ${file} refuses another teacher's resource before mutation`,async()=>{
  const {mocks,calls}=boundaries();
  const response=await load('app/api/teacher/'+file,mocks)[method](request(method),context);
  assert.equal(response.status,403);assert.equal(calls.length,1);
 });
}
for(const role of ['TEACHER','ADMIN'])test(`${role} can update an authorized lesson`,async()=>{
 const {mocks}=boundaries({userId:role==='TEACHER'?'teacher-b':'admin',role},{role});
 let writes=0;
 mocks['@/lib/prisma'].prisma.lesson.update=async({where,data})=>{assert.equal(where.id,'lesson');assert.equal(data.title,'عنوان دوره');writes++;return {id:'lesson',...data};};
 const response=await load('app/api/teacher/lessons/[lessonId]/route.ts',mocks).PATCH(request('PATCH'),context);
 assert.equal(response.status,200);assert.equal(writes,1);
});
test('legacy creation endpoint uses canonical validation and current account checks',async()=>{
 const {mocks,calls}=boundaries({userId:'admin',role:'ADMIN'},{role:'TEACHER'});
 const response=await load('app/teacher/courses/route.ts',mocks).POST(request('POST'));
 assert.equal(response.status,401);assert.equal(calls.length,0);
});
test('teacher home only queries owned courses and exposes separate course actions',async()=>{
 const {mocks}=boundaries();
 mocks['next/navigation']={redirect:()=>assert.fail('unexpected redirect')};
 mocks['next/link']={default:({children,...props})=>React.createElement('a',props,children)};
 mocks['@/lib/prisma'].prisma.course.findMany=async({where})=>{
  assert.deepEqual(where,{teacherId:'teacher-a'});
  return [{id:'mine',slug:'mine',title:'دوره من',status:'PUBLISHED',_count:{sections:1,enrollments:2}}];
 };
 const html=renderToStaticMarkup(await load('app/teacher/page.tsx',mocks).default());
 for(const suffix of ['','/students','/assignments','/interests'])assert.ok(html.includes(`href="/teacher/courses/mine${suffix}"`));
 assert.ok(html.includes('panel-action-teal'));
});
test('admin home leads to all-course management without a teacher filter',async()=>{
 const {mocks,calls}=boundaries({userId:'admin',role:'ADMIN'},{role:'ADMIN'});
 mocks['next/navigation']={redirect:url=>{throw Error(url);}};
 await assert.rejects(load('app/teacher/page.tsx',mocks).default(),{message:'/admin/courses'});
 assert.equal(calls.length,0);
});

for(const role of ['TEACHER','ADMIN'])test(`${role} course editor scopes its database read before rendering`,async()=>{
 const {mocks}=boundaries({userId:'actor',role},{role});
 mocks['next/navigation']={notFound:()=>{throw Error('NOT_FOUND');}};
 mocks['@/components/teacher/edit-course-form']={default:()=>null};
 mocks['@/lib/prisma'].prisma.course.findUnique=async({where})=>{
  assert.deepEqual(where,role==='ADMIN'?{id:'c'}:{id:'c',teacherId:'actor'});
  return null;
 };
 await assert.rejects(load('app/teacher/courses/[courseId]/edit/page.tsx',mocks).default(context),{message:'NOT_FOUND'});
});
