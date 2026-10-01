import {getManagementSession} from '@/lib/management-session';
import {issueCertificate} from '@/lib/certificates';
export async function POST(request:Request){
 const actor=await getManagementSession();if(!actor)return Response.json({message:'ابتدا وارد شوید.'},{status:401});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({message:'درخواست نامعتبر'},{status:403});
 try{const body=await request.json();if(typeof body.enrollmentId!=='string'||body.enrollmentId.length>100)throw Error('شناسه نامعتبر');const certificate=await issueCertificate({id:actor.userId,role:actor.role},body.enrollmentId);return Response.json({id:certificate.id});}catch(e){return Response.json({message:e instanceof Error?e.message:'صدور انجام نشد.'},{status:400});}
}
