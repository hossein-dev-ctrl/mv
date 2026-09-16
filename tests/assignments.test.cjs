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


const teacher={id:'t',role:'TEACHER'},student={id:'s',role:'STUDENT'},admin={id:'a',role:'ADMIN'};
function service({allowed=true,published=true,enrollmentStatus='ACTIVE',owner='t',version=1,latest=null,reviewStatus='PENDING',changedAccess=false}={}) {
 const writes=[];let locked=0,calls=0;
 const assignment={id:'a1',version,title:'تمرین',instructions:'صورت تکلیف ثبت‌شده',published,lesson:{status:'PUBLISHED',section:{courseId:'c',course:{teacherId:owner,status:'PUBLISHED'}}}};
 const tx={$queryRaw:async()=>{locked++;},assignment:{findUnique:async()=>assignment,update:async({data})=>{writes.push(data);return data;}},enrollment:{findUnique:async()=>({id:'e',userId:'s',courseId:'c',status:enrollmentStatus})},submission:{updateMany:async()=>({count:1}),findFirst:async()=>latest,create:async({data})=>{assert.ok(locked>=2);writes.push(data);return data;},findUnique:async()=>({id:'submission',status:reviewStatus,assignment}),update:async({data})=>{assert.ok(locked);writes.push(data);return data;}},lesson:{findUnique:async()=>assignment.lesson}};
 return {writes,tx,...load('lib/assignments.ts',{'@/lib/prisma':{prisma:{$transaction:fn=>fn(tx)}},'@/lib/lesson-access':{getLessonAccess:async()=>({allowed:allowed&&(!changedAccess||calls++===0),enrollment:{id:'e'}})}})};
}
const response={answer:'پاسخ دانش‌آموز',projectUrl:'https://example.com/project',version:1};
test('submission preserves assignment snapshot and first attempt',async()=>{
 const s=service();await s.submitAssignment(student,'lesson',response);assert.equal(s.writes[0].attempt,1);assert.equal(s.writes[0].assignmentInstructions,'صورت تکلیف ثبت‌شده');assert.equal(s.writes[0].enrollmentId,'e');
});
for(const options of [{allowed:false},{published:false},{enrollmentStatus:'CANCELLED'},{owner:'s'},{version:2},{changedAccess:true}])test('submission refuses unavailable or changed access '+JSON.stringify(options),async()=>{
 const s=service(options);await assert.rejects(s.submitAssignment(student,'lesson',response));assert.equal(s.writes.length,0);
});
for(const status of ['PENDING','GRADED'])test('duplicate or final submission cannot overwrite '+status,async()=>{
 const s=service({latest:{attempt:1,status}});await assert.rejects(s.submitAssignment(student,'lesson',response));assert.equal(s.writes.length,0);
});
test('requested revision creates new attempt instead of overwriting history',async()=>{
 const s=service({latest:{id:'old',attempt:2,status:'REVISION'}});await s.submitAssignment(student,'lesson',response);assert.equal(s.writes[0].attempt,3);assert.equal(s.writes[0].id,undefined);
});
test('review by owner stores score zero and immutable review metadata',async()=>{
 const s=service();await s.reviewSubmission(teacher,'submission',{action:'grade',score:0,feedback:'نیاز به تمرین بیشتر'});assert.equal(s.writes[0].score,0);assert.equal(s.writes[0].status,'GRADED');assert.equal(s.writes[0].reviewedBy,'t');
});
test('revision has feedback and no final score; admin may review',async()=>{
 const s=service();await s.reviewSubmission(admin,'submission',{action:'revision',feedback:'بخش دوم را تکمیل کنید'});assert.equal(s.writes[0].score,null);assert.equal(s.writes[0].status,'REVISION');
});
test('student, other teacher and repeated review cannot grade',async()=>{
 for(const actor of [student,{id:'other',role:'TEACHER'}])await assert.rejects(service().reviewSubmission(actor,'submission',{action:'grade',score:80,feedback:'ارزیابی'}));
 await assert.rejects(service({reviewStatus:'GRADED'}).reviewSubmission(teacher,'submission',{action:'grade',score:90,feedback:'ارزیابی دوم'}));
});
test('assignment edit detects stale version and rejects non-owner',async()=>{
 const data={title:'تمرین جدید',instructions:'این یک تکلیف جدید است',published:true,version:0};
 await assert.rejects(service().saveAssignment(teacher,'lesson',data));await assert.rejects(service({owner:'other'}).saveAssignment(teacher,'lesson',{...data,version:1}));
 const s=service();await s.saveAssignment(teacher,'lesson',{...data,version:1});assert.deepEqual(s.writes[0].version,{increment:1});
});
test('input validation rejects active links and out-of-range grades',()=>{
 const {submissionInput,reviewInput}=service();
 for(const projectUrl of ['javascript:alert(1)','http://example.com','https://name:password@example.com'])assert.equal(submissionInput.safeParse({...response,projectUrl}).success,false);
 assert.equal(submissionInput.safeParse({...response,projectUrl:''}).success,true);
 for(const score of [-1,101,5.5])assert.equal(reviewInput.safeParse({action:'grade',score,feedback:'نظر مدرس'}).success,false);
});
for(const reason of ['LESSON_LOCKED','NOT_ENROLLED','LESSON_NOT_PUBLISHED','COURSE_NOT_PUBLISHED'])test('lesson JSON endpoint applies shared access rule '+reason,async()=>{
 const {GET}=load('app/api/lessons/[lessonId]/route.ts',{'@/lib/auth':{getSession:async()=>({userId:'s'})},'@/lib/lesson-access':{getLessonAccess:async()=>({allowed:false,reason})}});
 const res=await GET(new Request('http://test/api'),{params:Promise.resolve({lessonId:'l'})});assert.equal(res.status,403);assert.equal((await res.json()).lesson,undefined);
});
test('student gradebook scopes both enrollment and submissions to logged-in user',async()=>{
 const Page=load('app/dashboard/courses/[courseId]/grades/page.tsx',{'@/lib/assignment-api':{assignmentActor:async()=>student},'next/link':{default:({children,href})=>React.createElement('a',{href},children)},'next/navigation':{redirect:()=>assert.fail(),notFound:()=>assert.fail()},'@/lib/prisma':{prisma:{enrollment:{findUnique:async({where})=>{assert.deepEqual(where.userId_courseId,{userId:'s',courseId:'c'});return {id:'own',status:'ACTIVE',course:{title:'Course'}};}},assignment:{findMany:async({include})=>{assert.deepEqual(include.submissions.where,{enrollmentId:'own'});return [];}}}}}).default;
 const html=renderToStaticMarkup(await Page({params:Promise.resolve({courseId:'c'})}));assert.match(html,/هنوز نمره‌ای ثبت نشده/);
});
