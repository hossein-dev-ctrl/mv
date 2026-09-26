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

const navigation = {
  redirect: url => { throw new Error('REDIRECT '+url); },
  notFound: () => { throw new Error('NOT_FOUND'); },
};
const link = {default:({href,children,...props})=>React.createElement('a',{href,...props},children)};
const course = {id:'course',title:'Scratch',status:'PUBLISHED',sections:[{id:'section',title:'فصل اول',lessons:[{id:'one',title:'درس اول'},{id:'two',title:'درس دوم'}]}]};
function boundaries({session={userId:'teacher',role:'TEACHER'},user={role:'TEACHER'},foundCourse=course,enrollment={}}={}) {
  const calls=[];
  const mocks={
    'next/link':link,'next/navigation':navigation,
    '@/lib/auth':{getSession:async()=>session},
    '@/lib/prisma':{prisma:{
      user:{findUnique:async()=>user},
      course:{findFirst:async query=>{calls.push(query);return foundCourse;}},
      enrollment,
    }},
  };
  return {mocks,calls};
}
for(const [name,options,expected] of [
 ['guest',{session:null},'REDIRECT /login'],
 ['student',{session:{userId:'s',role:'STUDENT'},user:{role:'STUDENT'}},'REDIRECT /dashboard'],
 ['stale role',{user:{role:'STUDENT'}},'REDIRECT /login'],
 ['deleted account',{user:null},'REDIRECT /login'],
]) test(name+' cannot read student records',async()=>{
 const {mocks,calls}=boundaries(options);
 const {getTeacherCourse}=load('lib/teacher-students.ts',mocks);
 await assert.rejects(getTeacherCourse('course'),{message:expected});
 assert.equal(calls.length,0);
});
test('teacher course lookup is scoped by owner and published lessons',async()=>{
 const {mocks,calls}=boundaries();
 await load('lib/teacher-students.ts',mocks).getTeacherCourse('course');
 assert.deepEqual(calls[0].where,{id:'course',teacherId:'teacher'});
 assert.deepEqual(calls[0].select.sections.select.lessons.where,{status:'PUBLISHED'});
});
test('admin may inspect courses owned by other teachers',async()=>{
 const {mocks,calls}=boundaries({session:{userId:'admin',role:'ADMIN'},user:{role:'ADMIN'}});
 await load('lib/teacher-students.ts',mocks).getTeacherCourse('course');
 assert.deepEqual(calls[0].where,{id:'course'});
});
test('missing or other-owner course stops before loading enrollments',async()=>{
 const {mocks}=boundaries({foundCourse:null,enrollment:{count:()=>assert.fail('must not read enrollment')}});
 const {default:Page}=load('app/teacher/courses/[courseId]/students/page.tsx',mocks);
 await assert.rejects(Page({params:Promise.resolve({courseId:'other'}),searchParams:Promise.resolve({})}),/NOT_FOUND/);
});
test('invalid query params are bounded and normalized',()=>{
 const {mocks}=boundaries();
 const {parseStudentFilters}=load('lib/teacher-students.ts',mocks);
 for(const page of ['-1','0','1.5','Infinity','9007199254740992',['2']]) {
   assert.deepEqual(parseStudentFilters({page,status:'BAD',q:['x']}),{q:'',status:undefined,page:1});
 }
 assert.deepEqual(parseStudentFilters({page:'2',q:'  سارا  ',status:'CANCELLED'}),{q:'سارا',page:2,status:'CANCELLED'});
 assert.equal(parseStudentFilters({q:'a'.repeat(500)}).q.length,100);
});
const row = {id:'enroll',status:'ACTIVE',enrolledAt:new Date('2026-09-01T12:00:00Z'),user:{name:'سارا',email:null,phone:null},progresses:[{lessonId:'one',status:'IN_PROGRESS',startedAt:new Date('2026-09-02'),completedAt:null,videoCompletedAt:new Date('2026-09-02')}]};
test('list filters, paginates and keeps search in next-page link',async()=>{
 const {mocks}=boundaries({enrollment:{
  count:async({where})=>{assert.equal(where.courseId,'course');assert.equal(where.status,'ACTIVE');assert.equal(where.user.OR[0].name.contains,'سارا');return 45;},
  findMany:async query=>{assert.equal(query.skip,20);assert.equal(query.take,20);assert.deepEqual(query.select.user.select,{name:true,email:true,phone:true});return [row];},
 }});
 const {default:Page}=load('app/teacher/courses/[courseId]/students/page.tsx',mocks);
 const html=renderToStaticMarkup(await Page({params:Promise.resolve({courseId:'course'}),searchParams:Promise.resolve({q:'سارا',status:'ACTIVE',page:'2'})}));
 assert.match(html,/page=3/);assert.match(html,/status=ACTIVE/);
 assert.match(html,/students\/enroll/);
 assert.match(html,/value="0" max="100"/); // Watched video alone is not completed.
});
test('out-of-range page is clamped after counting',async()=>{
 const {mocks}=boundaries({enrollment:{count:async()=>21,findMany:async query=>{assert.equal(query.skip,20);return [row];}}});
 const {default:Page}=load('app/teacher/courses/[courseId]/students/page.tsx',mocks);
 await Page({params:Promise.resolve({courseId:'course'}),searchParams:Promise.resolve({page:'999999'})});
});
for(const filtered of [false,true]) test('list empty state '+(filtered?'with search':'without search'),async()=>{
 const {mocks}=boundaries({enrollment:{count:async()=>0,findMany:async()=>[]}});
 const {default:Page}=load('app/teacher/courses/[courseId]/students/page.tsx',mocks);
 const html=renderToStaticMarkup(await Page({params:Promise.resolve({courseId:'course'}),searchParams:Promise.resolve(filtered?{q:'missing'}:{})}));
 assert.ok(html.includes(filtered?'نتیجه‌ای با این فیلترها پیدا نشد.':'هنوز کسی در این دوره ثبت‌نام نکرده است.'));
});
test('detail scopes enrollment to authorized course and rejects cross-course IDs',async()=>{
 const {mocks}=boundaries({enrollment:{findFirst:async query=>{assert.deepEqual(query.where,{id:'other-enrollment',courseId:'course'});return null;}}});
 const {default:Page}=load('app/teacher/courses/[courseId]/students/[enrollmentId]/page.tsx',mocks);
 await assert.rejects(Page({params:Promise.resolve({courseId:'course',enrollmentId:'other-enrollment'})}),/NOT_FOUND/);
});
test('detail preserves cancelled history and distinguishes watching from completion',async()=>{
 const {mocks}=boundaries({enrollment:{findFirst:async()=>({...row,status:'CANCELLED'})}});
 const {default:Page}=load('app/teacher/courses/[courseId]/students/[enrollmentId]/page.tsx',mocks);
 const html=renderToStaticMarkup(await Page({params:Promise.resolve({courseId:'course',enrollmentId:'enroll'})}));
 assert.match(html,/دسترسی آموزشی غیرفعال است/);
 assert.match(html,/در حال یادگیری/);assert.match(html,/شروع نشده/);
 assert.match(html,/پایان ویدئو/);assert.match(html,/تکمیل درس/);
 assert.match(html,/۰٪/);
});
