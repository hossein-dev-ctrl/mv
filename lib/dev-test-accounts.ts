import {cookies} from 'next/headers';
import {prisma} from '@/lib/prisma';
import {verifySession} from '@/lib/auth';
import {devTestingEnabled} from '@/lib/dev-test-policy';
// Never trust a role or original administrator ID supplied by the client.
export async function devTestOwner(){
 if(!devTestingEnabled())return null;
 const jar=await cookies();const currentToken=jar.get('session')?.value;if(!currentToken)return null;
 const session=await verifySession(currentToken);if(!session)return null;
 const user=await prisma.user.findUnique({where:{id:session.userId},select:{id:true,role:true,testOwnerId:true,demoBatchId:true}});
 if(!user||user.role!==session.role||user.demoBatchId)return null;
 if(user.role==='ADMIN'&&!user.testOwnerId&&!session.testMode)return {id:user.id,token:currentToken};
 if(!session.testMode||!user.testOwnerId)return null;
 const originalToken=jar.get('dev_test_admin')?.value;if(!originalToken)return null;
 const original=await verifySession(originalToken);if(!original||original.testMode||original.role!=='ADMIN'||original.userId!==user.testOwnerId)return null;
 const admin=await prisma.user.findUnique({where:{id:original.userId},select:{role:true,testOwnerId:true,demoBatchId:true}});
 return admin?.role==='ADMIN'&&!admin.testOwnerId&&!admin.demoBatchId?{id:original.userId,token:originalToken}:null;
}
export async function createTestScenario(ownerId:string){
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`dev-users:${ownerId}`})::bigint)`;
  const prior=await tx.user.findMany({where:{testOwnerId:ownerId}});if(prior.length)return prior;
  const users=[];
  for(const [name,role] of [['مدرس آزمایشی اول','TEACHER'],['مدرس آزمایشی دوم','TEACHER'],['دانش‌آموز آزمایشی اول','STUDENT'],['دانش‌آموز آزمایشی دوم','STUDENT']] as const)users.push(await tx.user.create({data:{name,role,testOwnerId:ownerId}}));
  for(let n=0;n<2;n++){
   const course=await tx.course.create({data:{teacherId:users[n].id,title:`دورهٔ آزمایشی مدرس ${n===0?'اول':'دوم'}`,slug:`test-${users[n].id}`,status:'PUBLISHED',deliveryStatus:'ONGOING',price:0,description:'این دوره برای تست مسیر درس، تمرین، آزمون و مدرک ساخته شده است.',sections:{create:{title:'فصل آزمایشی',order:1,lessons:{create:{title:'درس اول: شروع یادگیری',description:'این درس ویدئو ندارد. آن را کامل کنید، تمرین را بفرستید و در آزمون شرکت کنید.',order:1,status:'PUBLISHED',assignment:{create:{title:'تمرین آزمایشی',instructions:'یک جمله دربارهٔ آنچه یاد گرفتید بنویسید.',published:true}}}}}},finalExam:{create:{title:'آزمون آزمایشی',instructions:'گزینهٔ صحیح را انتخاب کنید.',published:true,examWeight:50,questions:[{type:'CHOICE',prompt:'حاصل دو به علاوهٔ دو کدام است؟',options:['یک','دو','سه','چهار'],correctOption:3}]}}}});
   await tx.enrollment.create({data:{userId:users[n+2].id,courseId:course.id}});
  }
  return users;
 },{timeout:20000});
}
