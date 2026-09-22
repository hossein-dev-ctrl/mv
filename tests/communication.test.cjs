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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
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

const student={userId:'student',role:'STUDENT'},teacher={userId:'teacher',role:'TEACHER'},admin={userId:'admin',role:'ADMIN'};
const uuid='e4106c70-5d70-4e19-a088-d2c19f1b8203';
const input={subject:'پرسش درباره درس',body:'متن پیام آزمایشی',recipientId:'teacher',requestId:uuid};

test('ticket file validates actual type and normalizes unsafe filename characters',async()=>{
 const {validateTicketFile}=load('lib/ticket-attachments.ts',{'@/lib/communication':{CommunicationError:class extends Error {constructor(message,status){super(message);this.status=status;}}}});
 const file=await validateTicketFile(new File(['%PDF-1.7\nexample'],'../test\r\n.pdf',{type:'text/html'}));
 assert.equal(file.contentType,'application/pdf');assert.ok(!/[\r\n/]/.test(file.filename));assert.equal(file.size,file.data.length);
 for(const [name,body] of [['fake.png','not png'],['run.html','<script>bad</script>'],['text.txt',new Uint8Array([255,0,1])]])await assert.rejects(validateTicketFile(new File([body],name)),e=>e.status===415);
 for(const body of ['',new Uint8Array(5*1024*1024+1)])await assert.rejects(validateTicketFile(new File([body],'test.txt')),e=>e.status===413);
});
test('multipart parser accepts one attachment and rejects duplicate files',async()=>{
 const {readTicketRequest}=load('lib/ticket-attachments.ts',{'@/lib/communication':{CommunicationError:class extends Error {constructor(message,status){super(message);this.status=status;}}}});
 const form=new FormData();form.set('payload',JSON.stringify(input));form.set('file',new File(['متن فایل'],'example.txt'));
 const parsed=await readTicketRequest(new Request('http://test',{method:'POST',body:form}));assert.deepEqual(parsed.payload,input);assert.equal(parsed.attachment.contentType,'text/plain');
 form.append('file',new File(['second'],'second.txt'));await assert.rejects(readTicketRequest(new Request('http://test',{method:'POST',body:form})),/یک فایل/);
});
test('streamed request limit is enforced without a Content-Length header',async()=>{
 const {readTicketRequest}=load('lib/ticket-attachments.ts',{'@/lib/communication':{CommunicationError:class extends Error {constructor(message,status){super(message);this.status=status;}}}});
 const request=new Request('http://test',{method:'POST',body:new Uint8Array(6*1024*1024)});
 assert.equal(request.headers.get('content-length'),null);await assert.rejects(readTicketRequest(request),e=>e.status===413);
});
for(const actor of [student,teacher,admin])test(`${actor.role} attachment download checks ticket visibility and forces private download`,async()=>{
 const scope=actor.role==='ADMIN'?{}:{OR:[{creatorId:actor.userId},{recipientId:actor.userId}]};let found=true;
 const {GET}=load('app/api/tickets/attachments/[attachmentId]/route.ts',{'@/lib/communication':{communicationActor:async()=>actor,ticketScope:()=>scope},'@/lib/prisma':{prisma:{ticketAttachment:{findFirst:async({where})=>{assert.deepEqual(where,{id:'file',message:{ticket:scope}});return found?{data:new Uint8Array([1,2]),size:2,filename:'تست.pdf',contentType:'application/pdf'}:null;}}}}});
 const response=await GET(new Request('http://test'),{params:Promise.resolve({attachmentId:'file'})});assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.match(response.headers.get('Content-Disposition'),/^attachment;/);assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
 found=false;assert.equal((await GET(new Request('http://test'),{params:Promise.resolve({attachmentId:'file'})})).status,404);
});
test('guest cannot download attachments before login',async()=>{
 const {GET}=load('app/api/tickets/attachments/[attachmentId]/route.ts',{'@/lib/communication':{communicationActor:async()=>null},'@/lib/prisma':{prisma:{}}});assert.equal((await GET(new Request('http://test'),{params:Promise.resolve({attachmentId:'file'})})).status,401);
});
function service(overrides={}){
 const calls={notices:[],tickets:[],messages:[],updates:[],locks:0};
 const ticket={id:'ticket',creatorId:'student',recipientId:'teacher',subject:input.subject,status:'OPEN'};
 const tx={
  $queryRaw:async()=>{calls.locks++;},
  user:{findFirst:async()=>({id:'teacher'}),findMany:async()=>[{id:'admin'}]},
  ticket:{findUnique:async()=>null,findFirst:async()=>ticket,create:async({data})=>{calls.tickets.push(data);return {...ticket,...data};},update:async({data})=>{calls.updates.push(data);return {...ticket,...data};}},
  ticketMessage:{findUnique:async()=>null,create:async({data})=>{calls.messages.push(data);return {id:'message',...data};}},
  notification:{createMany:async({data,skipDuplicates})=>{assert.equal(skipDuplicates,true);calls.notices.push(...data);return {count:data.length};}},
  notificationDispatch:{findUnique:async()=>null,create:async({data})=>data},
  course:{findFirst:async()=>({id:'course'})},
  ...overrides,
 };
 const db={$transaction:fn=>fn(tx)};
 const api=load('lib/communication.ts',{'@/lib/prisma':{prisma:db},'@/lib/management-session':{getManagementSession:async()=>student}});
 return {...api,tx,calls,ticket};
}
test('ticket visibility is participant-only with an explicit admin exception',()=>{
 const s=service();assert.deepEqual(s.ticketScope(student),{OR:[{creatorId:'student'},{recipientId:'student'}]});assert.deepEqual(s.ticketScope(admin),{});
});
function namedPeople(s){
 const people=[{id:'student',name:'سارا',role:'STUDENT'},{id:'teacher',name:'مدرس نمونه',role:'TEACHER'},{id:'admin',name:'مدیر',role:'ADMIN'},{id:'observer',name:'مدیر دوم',role:'ADMIN'}];
 s.tx.user.findMany=async({where})=>where.role==='ADMIN'?people.filter(p=>p.role==='ADMIN'&&!where.id.notIn.includes(p.id)):people.filter(p=>where.id.in.includes(p.id));
}
test('direct participants receive personal notices and observing admins receive system notices with both names',async()=>{
 const s=service();namedPeople(s);await s.createTicket(student,input);
 assert.equal(s.calls.notices.find(n=>n.userId==='teacher').scope,'PERSONAL');
 assert.equal(s.calls.notices.find(n=>n.userId==='admin').scope,'SYSTEM');
 assert.ok(s.calls.notices.every(n=>n.senderName==='سارا (دانش‌آموز)'&&n.recipientName==='مدرس نمونه (مدرس)'));
});
test('an admin participant gets one personal notification instead of an observer copy',async()=>{
 const s=service();namedPeople(s);s.ticket.creatorId='admin';s.ticket.recipientId='student';await s.replyTicket(student,'ticket',{body:'پاسخ',requestId:uuid});
 const direct=s.calls.notices.filter(n=>n.userId==='admin');assert.equal(direct.length,1);assert.equal(direct[0].scope,'PERSONAL');assert.equal(direct[0].recipientName,'مدیر (مدیر)');assert.equal(s.calls.notices.find(n=>n.userId==='observer').scope,'SYSTEM');
});
test('support-queue tickets are personal to managers, not observer notifications',async()=>{
 const s=service();namedPeople(s);await s.createTicket(student,{...input,recipientId:null});assert.ok(s.calls.notices.every(n=>n.scope==='PERSONAL'));assert.ok(s.calls.notices.every(n=>n.recipientName==='پشتیبانی مدیریت'));
});
test('attachments are created inside the message write and retry creates no second file',async()=>{
 const s=service();const file={filename:'test.txt',contentType:'text/plain',size:1,data:new Uint8Array([65])};
 await s.createTicket(student,input,file);assert.deepEqual(s.calls.tickets[0].messages.create.attachments.create,file);
 await s.replyTicket(teacher,'ticket',{body:'پیوست',requestId:uuid},file);assert.deepEqual(s.calls.messages[0].attachments.create,file);
 s.tx.ticketMessage.findUnique=async()=>({id:'existing'});await s.replyTicket(teacher,'ticket',{body:'پیوست',requestId:uuid},file);assert.equal(s.calls.messages.length,1);
});
test('notification scope filters are available only to administrators',()=>{
 const {notificationScope}=load('lib/notification-scope.ts');assert.equal(notificationScope('ADMIN','SYSTEM'),'SYSTEM');assert.equal(notificationScope('ADMIN','PERSONAL'),'PERSONAL');assert.equal(notificationScope('STUDENT','SYSTEM'),undefined);assert.equal(notificationScope('ADMIN','INVALID'),undefined);
});
test('reading an admin category leaves the other category untouched',async()=>{
 const {POST}=load('app/api/notifications/read/route.ts',{'@/lib/communication':{communicationActor:async()=>admin},'@/lib/prisma':{prisma:{notification:{updateMany:async({where})=>{assert.deepEqual(where,{userId:'admin',readAt:null,scope:'SYSTEM'});return {count:1};}}}}});
 assert.equal((await POST(new Request('http://test',{method:'POST',body:JSON.stringify({all:true,scope:'SYSTEM'})}))).status,200);
});
test('contacts expose teachers to students and enrolled students to their teacher',()=>{
 const s=service();assert.equal(s.contactScope(student).role,'TEACHER');assert.equal(s.contactScope(student).demoBatchId,null);
 assert.deepEqual(s.contactScope(teacher).enrollments,{some:{status:{in:['ACTIVE','COMPLETED']},course:{teacherId:'teacher'}}});
 assert.equal(s.contactScope(admin).enrollments,undefined);assert.deepEqual(s.contactScope(admin).id,{not:'admin'});
});
test('new ticket validates the recipient scope and notifies only recipient and managers',async()=>{
 const s=service();s.tx.user.findFirst=async({where})=>{assert.deepEqual(where.AND[0],s.contactScope(student));assert.deepEqual(where.AND[1],{id:'teacher'});return {id:'teacher'};};
 const ticket=await s.createTicket(student,input);assert.equal(ticket.id,'ticket');assert.equal(s.calls.tickets[0].messages.create.senderId,'student');
 assert.deepEqual(s.calls.notices.map(n=>n.userId),['teacher','admin']);assert.ok(s.calls.notices.every(n=>n.href==='/tickets/ticket'));
});
test('forged recipient cannot create a ticket or notification',async()=>{
 const s=service();s.tx.user.findFirst=async()=>null;
 await assert.rejects(s.createTicket(teacher,{...input,recipientId:'unrelated-student'}),e=>e.status===403);assert.equal(s.calls.tickets.length,0);assert.equal(s.calls.notices.length,0);
});
test('student can create a manager support ticket without leaking another participant',async()=>{
 const s=service();s.tx.user.findFirst=()=>assert.fail('no recipient lookup for support');await s.createTicket(student,{...input,recipientId:null});assert.deepEqual(s.calls.notices.map(n=>n.userId),['admin']);
});
test('admin must choose a recipient',async()=>{
 const s=service();await assert.rejects(s.createTicket(admin,{...input,recipientId:null}),e=>e.status===400);assert.equal(s.calls.tickets.length,0);
});
test('retries of ticket creation return the existing ticket without duplicate notices',async()=>{
 const s=service();s.tx.ticket.findUnique=async({where})=>{assert.deepEqual(where.creatorId_clientRequestId,{creatorId:'student',clientRequestId:uuid});return s.ticket;};
 await s.createTicket(student,input);assert.equal(s.calls.tickets.length,0);assert.equal(s.calls.notices.length,0);
});
for(const actor of [student,teacher])test(`${actor.role} cannot reply to or close a different conversation`,async()=>{
 const s=service();s.tx.ticket.findFirst=async({where})=>{assert.deepEqual(where,{id:'private',...s.ticketScope(actor)});return null;};
 await assert.rejects(s.replyTicket(actor,'private',{body:'test',requestId:uuid}),e=>e.status===404);
 await assert.rejects(s.setTicketStatus(actor,'private',{status:'CLOSED'}),e=>e.status===404);
 assert.equal(s.calls.messages.length,0);assert.equal(s.calls.updates.length,0);
});
test('closed ticket refuses a reply and participants may reopen it',async()=>{
 const s=service();s.ticket.status='CLOSED';await assert.rejects(s.replyTicket(student,'ticket',{body:'test',requestId:uuid}),e=>e.status===409);
 await s.setTicketStatus(student,'ticket',{status:'OPEN'});assert.deepEqual(s.calls.updates,[{status:'OPEN'}]);assert.equal(s.calls.locks,2);
});
test('reply writes after a lock and notifies the other participant',async()=>{
 const s=service();await s.replyTicket(teacher,'ticket',{body:'پاسخ مدرس',requestId:uuid});assert.equal(s.calls.locks,1);assert.equal(s.calls.messages[0].senderId,'teacher');assert.deepEqual(s.calls.notices.map(n=>n.userId),['student','admin']);
});
test('same reply request cannot append a second message',async()=>{
 const s=service();s.tx.ticketMessage.findUnique=async({where})=>{assert.equal(where.ticketId_senderId_clientRequestId.senderId,'teacher');return {id:'existing'};};
 assert.equal((await s.replyTicket(teacher,'ticket',{body:'test',requestId:uuid})).id,'existing');assert.equal(s.calls.messages.length,0);assert.equal(s.calls.notices.length,0);
});
test('non-admin cannot send an announcement even with forged audience',async()=>{
 const s=service();await assert.rejects(s.sendAnnouncement(teacher,{}),e=>e.status===403);assert.equal(s.calls.notices.length,0);
});
const announcement={title:'اطلاعیه دوره',body:'جلسه جدید منتشر شده است',audience:'COURSE',targetId:'course',requestId:uuid};
test('course announcement includes only non-cancelled enrollment recipients',async()=>{
 const s=service();s.tx.user.findMany=async({where})=>{assert.equal(where.demoBatchId,null);assert.deepEqual(where.enrollments,{some:{courseId:'course',status:{in:['ACTIVE','COMPLETED']}}});return [{id:'s1'},{id:'s2'}];};
 const result=await s.sendAnnouncement(admin,announcement);assert.equal(result.recipientCount,2);assert.equal(s.calls.notices.length,2);assert.ok(s.calls.notices.every(n=>n.eventKey===`announcement:${uuid}`));
});
test('announcement retry returns the original audience count without resending',async()=>{
 const s=service();s.tx.notificationDispatch.findUnique=async()=>({senderId:'admin',recipientCount:4});assert.equal((await s.sendAnnouncement(admin,announcement)).recipientCount,4);assert.equal(s.calls.notices.length,0);
});
test('invalid course and empty recipients cannot produce a broadcast',async()=>{
 const s=service();s.tx.course.findFirst=async()=>null;await assert.rejects(s.sendAnnouncement(admin,announcement),e=>e.status===400);
 s.tx.user.findMany=async()=>[];await assert.rejects(s.sendAnnouncement(admin,{...announcement,audience:'USER',targetId:'missing'}),e=>e.status===400);assert.equal(s.calls.notices.length,0);
});
test('text and idempotency input limits reject invalid requests',()=>{
 const s=service();for(const invalid of [{...input,body:'x'.repeat(6001)},{...input,subject:' '},{...input,requestId:'not-uuid'}])assert.equal(s.newTicketInput.safeParse(invalid).success,false);
 assert.equal(s.statusInput.safeParse({status:'DELETED'}).success,false);
});
test('notification read always scopes to current user, even for another user ID',async()=>{
 let called=false;const route=load('app/api/notifications/read/route.ts',{'@/lib/communication':{communicationActor:async()=>student},'@/lib/prisma':{prisma:{notification:{updateMany:async({where})=>{assert.deepEqual(where,{userId:'student',readAt:null,id:'someone-elses'});called=true;return {count:0};}}}}});
 const response=await route.POST(new Request('http://test',{method:'POST',body:JSON.stringify({id:'someone-elses',userId:'victim'})}));assert.equal(response.status,200);assert.equal((await response.json()).count,0);assert.ok(called);
});
test('bell only counts and lists the current user notifications',async()=>{
 const route=load('app/api/notifications/route.ts',{'@/lib/communication':{communicationActor:async()=>teacher},'@/lib/prisma':{prisma:{notification:{count:async({where})=>{assert.deepEqual(where,{userId:'teacher',readAt:null});return 2;},findMany:async({where,take})=>{assert.deepEqual(where,{userId:'teacher'});assert.equal(take,5);return [];}}}}});
 const response=await route.GET();assert.equal((await response.json()).unread,2);assert.match(response.headers.get('Cache-Control'),/no-store/);
});
test('unauthorized ticket page stops before fetching any messages',async()=>{
 const Page=load('app/tickets/[ticketId]/page.tsx',{'@/lib/communication':{communicationActor:async()=>student,ticketScope:()=>({creatorId:'student'})},'@/lib/prisma':{prisma:{ticket:{findFirst:async({where})=>{assert.deepEqual(where,{id:'private',creatorId:'student'});return null;}},ticketMessage:{count:()=>assert.fail('private messages must not load')}}},'@/components/communication/forms':{TicketReply:()=>null},'next/navigation':{notFound:()=>{throw Error('NOT_FOUND');}},'next/link':{default:()=>null}}).default;
 await assert.rejects(Page({params:Promise.resolve({ticketId:'private'}),searchParams:Promise.resolve({})}),/NOT_FOUND/);
});
test('ticket page escapes message content instead of rendering HTML',async()=>{
 const api=service();const Page=load('app/tickets/[ticketId]/page.tsx',{'@/lib/communication':{...api,communicationActor:async()=>student},'@/lib/prisma':{prisma:{ticket:{findFirst:async()=>({...api.ticket,creator:{id:'student',name:'دانش‌آموز',role:'STUDENT'},recipient:null})},ticketMessage:{count:async()=>1,findMany:async()=>[{id:'m',senderId:'student',sender:{id:'student',name:'دانش‌آموز',role:'STUDENT'},body:'<script>alert(1)</script>',attachments:[],createdAt:new Date()}]}}},'@/components/communication/forms':{TicketReply:()=>null},'next/navigation':{},'next/link':{default:({children,href})=>React.createElement('a',{href},children)}}).default;
 const html=renderToStaticMarkup(await Page({params:Promise.resolve({ticketId:'ticket'}),searchParams:Promise.resolve({})}));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
});
test('notification batches deduplicate recipients and cap inserts at 500',async()=>{
 const {notifyUsers}=load('lib/notifications.ts');const batches=[];
 await notifyUsers({notification:{createMany:async q=>batches.push(q)}},[...Array.from({length:501},(_,i)=>String(i)),'0'],{title:'t',body:'b',href:'/notifications',eventKey:'event'});
 assert.deepEqual(batches.map(b=>b.data.length),[500,1]);assert.ok(batches.every(b=>b.skipDuplicates));
});
test('course notification recipients exclude cancelled, demo and admin accounts',async()=>{
 const {notifyCourse}=load('lib/notifications.ts');let notices;
 await notifyCourse({enrollment:{findMany:async({where})=>{assert.deepEqual(where.status,{in:['ACTIVE','COMPLETED']});assert.equal(where.user.demoBatchId,null);assert.equal(where.user.role.not,'ADMIN');assert.equal(where.course.status,'PUBLISHED');return [{userId:'student'}];}},notification:{createMany:async({data})=>{notices=data;}}},'course',{title:'t',body:'b',href:'/courses/c',eventKey:'event'});
 assert.equal(notices[0].userId,'student');
});
test('draft lessons or courses do not trigger publication notifications',async()=>{
 const {notifyLessonPublished}=load('lib/notifications.ts');for(const [lessonStatus,courseStatus] of [['DRAFT','PUBLISHED'],['PUBLISHED','DRAFT']])await notifyLessonPublished({lesson:{findUnique:async()=>({status:lessonStatus,section:{course:{status:courseStatus}}})},enrollment:{findMany:()=>assert.fail('draft must not notify')}},'lesson');
});
test('published lessons and assignments use stable event keys across retries',async()=>{
 const {notifyLessonPublished}=load('lib/notifications.ts');const notices=[];
 const tx={lesson:{findUnique:async()=>({id:'lesson',title:'درس',status:'PUBLISHED',section:{course:{id:'course',slug:'sample',title:'دوره',status:'PUBLISHED'}},assignment:{id:'assignment',title:'تمرین',published:true,version:2}})},enrollment:{findMany:async()=>[{userId:'student'}]},notification:{createMany:async({data})=>notices.push(...data)}};
 await notifyLessonPublished(tx,'lesson');await notifyLessonPublished(tx,'lesson');assert.deepEqual(notices.map(n=>n.eventKey),['lesson:lesson:published','assignment:assignment:v2','lesson:lesson:published','assignment:assignment:v2']);
});
for(const file of ['app/api/tickets/route.ts','app/api/tickets/[ticketId]/reply/route.ts','app/api/notifications/read/route.ts','app/api/admin/notifications/route.ts'])test(`${file} refuses anonymous writes`,async()=>{
 const route=load(file,{'@/lib/communication':{communicationActor:async()=>null},'@/lib/prisma':{prisma:{}}});assert.equal((await route.POST(new Request('http://test',{method:'POST'}),{params:Promise.resolve({ticketId:'ticket'})})).status,401);
});
