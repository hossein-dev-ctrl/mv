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

function database(initial) {
  let row = initial ? { id: 'progress', enrollmentId: 'enrollment', lessonId: 'lesson',
    startedAt: null, completedAt: null, videoCompletedAt: null, ...initial } : null;
  const matches = (where) => row && Object.entries(where).every(([key, value]) => row[key] === value);
  const model = {
    async createMany({ data }) {
      if (!row) row = { id: 'progress', completedAt: null, videoCompletedAt: null, ...data[0] };
    },
    async updateMany({ where, data }) {
      if (matches(where)) Object.assign(row, data);
    },
    async findUniqueOrThrow() { assert.ok(row); return { ...row }; },
  };
  return { prisma: { $transaction: async (fn) => fn({ lessonProgress: model }) }, get: () => row };
}

const old = new Date('2026-09-01T12:00:00Z');
for (const video of [false, true]) {
  for (const status of [null, 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']) {
    test(`${video ? 'video end' : 'start'} preserves progress from ${status ?? 'missing record'}`, async () => {
      const db = database(status ? { status, ...(status === 'COMPLETED' ? {
        startedAt: old, completedAt: old, videoCompletedAt: old,
      } : {}) } : null);
      const { recordLessonActivity } = load('lib/lesson-progress.ts', { '@/lib/prisma': db });
      const result = await recordLessonActivity('enrollment', 'lesson', video);
      assert.equal(result.status, status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS');
      assert.ok(result.startedAt);
      if (video) assert.ok(result.videoCompletedAt);
      if (status === 'COMPLETED') {
        assert.equal(result.completedAt, old);
        assert.equal(result.startedAt, old);
        assert.equal(result.videoCompletedAt, old);
      }
      const repeated = await recordLessonActivity('enrollment', 'lesson', video);
      assert.deepEqual(repeated, result);
    });
  }
}

const context = { params: Promise.resolve({ lessonId: 'lesson' }) };
function route(name, overrides = {}) {
  return load(`app/api/lessons/[lessonId]/${name}/route.ts`, {
    '@/lib/auth': { getSession: async () => ({ userId: 'student' }) },
    '@/lib/lesson-access': { getLessonAccess: async () => ({ allowed: true,
      enrollment: { id: 'enrollment' }, lesson: { videoUrl: '/video.mp4' } }) },
    '@/lib/lesson-progress': { recordLessonActivity: async () => { throw new Error('Unexpected write'); } },
    ...overrides,
  }).POST;
}

for (const name of ['start', 'video-complete']) {
  test(`${name} rejects unauthenticated requests`, async () => {
    const post = route(name, { '@/lib/auth': { getSession: async () => null } });
    assert.equal((await post(new Request('http://localhost'), context)).status, 401);
  });
  for (const reason of ['NOT_ENROLLED', 'LESSON_LOCKED', 'LESSON_NOT_PUBLISHED', 'COURSE_NOT_PUBLISHED']) {
    test(`${name} rejects ${reason} before any write`, async () => {
      const post = route(name, { '@/lib/lesson-access': {
        getLessonAccess: async () => ({ allowed: false, reason }),
      } });
      const response = await post(new Request('http://localhost'), context);
      assert.equal(response.status, 403);
      assert.equal((await response.json()).reason, reason);
    });
  }
  test(`${name} updates real progress logic after access is granted`, async () => {
    const db = database({ status: 'NOT_STARTED' });
    const activity = load('lib/lesson-progress.ts', { '@/lib/prisma': db });
    const response = await route(name, { '@/lib/lesson-progress': activity })(new Request('http://localhost'), context);
    assert.equal(response.status, 200);
    assert.equal(db.get().status, 'IN_PROGRESS');
    assert.equal(Boolean(db.get().videoCompletedAt), name === 'video-complete');
  });
}

test('video-complete rejects lessons without video', async () => {
  const post = route('video-complete', { '@/lib/lesson-access': {
    getLessonAccess: async () => ({ allowed: true, enrollment: { id: 'enrollment' }, lesson: { videoUrl: null } }),
  } });
  assert.equal((await post(new Request('http://localhost'), context)).status, 400);
});

for (const hasCompletedVideo of [false, true]) {
  test(`fresh page render restores saved video flag ${hasCompletedVideo}`, () => {
    const { default: Content } = load('components/course/lesson-content.tsx', {
      'next/navigation': { useRouter: () => ({ refresh() {} }) },
    });
    const markup = renderToStaticMarkup(React.createElement(Content, {
      lessonId: 'lesson', videoUrl: '/video.mp4', isCompleted: false, hasCompletedVideo,
    }));
    assert.equal(/<button[^>]*\sdisabled=""/.test(markup), !hasCompletedVideo);
    assert.match(markup, /تکمیل درس/);
    assert.equal(markup.includes('ویدئو به طور کامل مشاهده شد'), hasCompletedVideo);
  });
}

test('a lesson without video can be completed immediately', () => {
  const { default: Content } = load('components/course/lesson-content.tsx', {
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
  });
  const markup = renderToStaticMarkup(React.createElement(Content, {
    lessonId: 'lesson', videoUrl: null, isCompleted: false, hasCompletedVideo: false,
  }));
  assert.match(markup, /<button/);
  assert.doesNotMatch(markup, /<button[^>]*\sdisabled=""/);
});

test('completed lesson renders confirmation instead of another completion button', () => {
  const { default: Content } = load('components/course/lesson-content.tsx', {
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
  });
  const markup = renderToStaticMarkup(React.createElement(Content, {
    lessonId: 'lesson', videoUrl: '/video.mp4', isCompleted: true, hasCompletedVideo: true,
  }));
  assert.doesNotMatch(markup, /<button/);
  assert.match(markup, /این درس را تکمیل کرده‌اید/);
});
