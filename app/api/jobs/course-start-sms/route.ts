import {timingSafeEqual} from 'node:crypto';
import {processCourseStartSms} from '@/lib/course-start-sms';
export const maxDuration=60;
export async function POST(request:Request){
 const secret=process.env.CRON_SECRET;const expected=`Bearer ${secret}`;const actual=request.headers.get('authorization')||'';
 if(!secret||actual.length!==expected.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return Response.json({message:'Unauthorized'},{status:401});
 return Response.json(await processCourseStartSms());
}
