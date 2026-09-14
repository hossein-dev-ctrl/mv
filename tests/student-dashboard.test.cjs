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


const { getLearningSummary: summary } = load('lib/student-dashboard.ts');
const lessons = [{id:'one',title:'اول'}, {id:'two',title:'دوم'}];
const done = (id) => ({lessonId:id,status:'COMPLETED',startedAt:new Date()});
test('counts only currently published lessons', () => {
  const result = summary(lessons,[done('one'),done('removed')],'PUBLISHED');
  assert.equal(result.completedLessons,1);
  assert.equal(result.percentage,50);
  assert.equal(result.nextLesson.id,'two');
});
test('empty course is waiting, not completed', () => {
  const result = summary([],[],'PUBLISHED');
  assert.equal(result.state,'empty');
  assert.equal(result.percentage,0);
  assert.equal(result.isCompleted,false);
});
test('new enrollment starts at first lesson', () => {
  const result = summary(lessons,[],'PUBLISHED');
  assert.equal(result.state,'not-started');
  assert.equal(result.nextLesson.id,'one');
});
test('started but unfinished first lesson is resumed', () => {
  const result = summary(lessons,[{lessonId:'one',status:'IN_PROGRESS',startedAt:new Date()}],'PUBLISHED');
  assert.equal(result.state,'in-progress');
  assert.equal(result.nextLesson.id,'one');
});
test('all lessons completed enables review', () => {
  const result = summary(lessons,lessons.map(l=>done(l.id)),'PUBLISHED');
  assert.equal(result.state,'completed');
  assert.equal(result.nextLesson,null);
  assert.equal(result.percentage,100);
});
for (const status of ['DRAFT','ARCHIVED']) test(status+' course has no lesson link', () => {
  const result = summary(lessons,[done('one')],status);
  assert.equal(result.nextLesson,null);
  assert.equal(result.state,'unavailable');
});
test('newly published lesson reopens learning after prior completion', () => {
  assert.equal(summary(lessons,[done('one')],'PUBLISHED').nextLesson.id,'two');
});
test('first unfinished lesson is selected even if later lesson is complete', () => {
  assert.equal(summary(lessons,[done('two')],'PUBLISHED').nextLesson.id,'one');
});
async function renderDashboard(enrollments) {
  const {default: Page} = load('app/dashboard/page.tsx', {
    '@/lib/auth': {getSession:async()=>({userId:'student'})},
    '@/lib/prisma': {prisma:{enrollment:{findMany:async(query)=>{
      assert.equal(query.where.userId,'student');
      assert.deepEqual(query.where.status.in,['ACTIVE','COMPLETED']);
      assert.equal(query.include.course.include.sections.include.lessons.where.status,'PUBLISHED');
      return enrollments;
    }}}},
    'next/link': {default:({href,children,...props})=>React.createElement('a',{href,...props},children)},
    'next/navigation':{redirect:()=>{throw Error('unexpected redirect');}},
  });
  return renderToStaticMarkup(await Page());
}
const enrollment = {id:'e',status:'ACTIVE',progresses:[done('one'),done('removed')],
  course:{status:'PUBLISHED',slug:'course',title:'دوره نمونه',thumbnailUrl:null,shortDescription:null,sections:[{lessons}]}};
test('dashboard renders correct next lesson and progress', async()=>{
  const html=await renderDashboard([enrollment]);
  assert.match(html,/href="\/courses\/course\/lessons\/two"/);
  assert.match(html,/aria-valuenow="50"/);
  assert.match(html,/ادامهٔ یادگیری/);
});
test('dashboard renders empty enrollment guidance',async()=>{
  const html=await renderDashboard([]);
  assert.match(html,/هنوز در دوره‌ای ثبت‌نام نکرده‌اید/);
  assert.match(html,/href="\/courses"/);
});
test('dashboard does not link into unavailable courses',async()=>{
  const html=await renderDashboard([{...enrollment,course:{...enrollment.course,status:'ARCHIVED'}}]);
  assert.doesNotMatch(html,/href="\/courses\/course/);
  assert.match(html,/ثبت‌نام و پیشرفت شما حفظ شده است/);
});
