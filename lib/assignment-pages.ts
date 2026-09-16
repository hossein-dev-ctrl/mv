import {redirect,notFound} from 'next/navigation';
import {assignmentActor} from '@/lib/assignment-api';
import {prisma} from '@/lib/prisma';
export async function teachingCourse(courseId:string){
 const actor=await assignmentActor();if(!actor)redirect('/login');
 if(!['ADMIN','TEACHER'].includes(actor.role))redirect('/dashboard');
 const course=await prisma.course.findUnique({where:{id:courseId},select:{id:true,title:true,teacherId:true}});
 if(!course||(actor.role!=='ADMIN'&&course.teacherId!==actor.id))notFound();return course;
}
