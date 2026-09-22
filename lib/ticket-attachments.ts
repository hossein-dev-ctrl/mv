import {CommunicationError} from '@/lib/communication';

export const MAX_TICKET_FILE = 5 * 1024 * 1024;
const MAX_REQUEST = MAX_TICKET_FILE + 128 * 1024;
export type TicketFile = {filename:string;contentType:string;size:number;data:Uint8Array<ArrayBuffer>};

export async function validateTicketFile(file:File):Promise<TicketFile> {
 if(!file.size||file.size>MAX_TICKET_FILE)throw new CommunicationError('حجم فایل باید بیشتر از صفر و حداکثر ۵ مگابایت باشد.',413);
 const data=new Uint8Array(await file.arrayBuffer());
 const ext=file.name.split('.').pop()?.toLowerCase();
 const signature=Array.from(data.slice(0,12)).map(x=>x.toString(16).padStart(2,'0')).join('');
 let contentType='';
 if(ext==='pdf'&&signature.startsWith('255044462d'))contentType='application/pdf';
 if(ext==='png'&&signature.startsWith('89504e470d0a1a0a'))contentType='image/png';
 if(['jpg','jpeg'].includes(ext||'')&&signature.startsWith('ffd8ff'))contentType='image/jpeg';
 if(ext==='webp'&&signature.startsWith('52494646')&&signature.slice(16,24)==='57454250')contentType='image/webp';
 if(ext==='zip'&&['504b0304','504b0506','504b0708'].some(s=>signature.startsWith(s)))contentType='application/zip';
 if(ext==='txt'){
  try{new TextDecoder('utf-8',{fatal:true}).decode(data);if(!data.includes(0))contentType='text/plain';}catch{}
 }
 if(!contentType)throw new CommunicationError('فایل مجاز نیست. PDF، تصویر PNG/JPG/WebP، متن UTF-8 یا ZIP انتخاب کنید.',415);
 const filename=file.name.replace(/[\x00-\x1f\x7f/\\\u202a-\u202e\u2066-\u2069]/g,'_').slice(-160)||`attachment.${ext}`;
 return {filename,contentType,size:data.length,data};
}

// Bound streamed bodies too: Content-Length is optional and cannot be trusted.
export async function readTicketRequest(request:Request):Promise<{payload:unknown;attachment?:TicketFile}>{
 if(Number(request.headers.get('content-length'))>MAX_REQUEST)throw new CommunicationError('حجم درخواست بیش از حد مجاز است.',413);
 if(!request.body)throw new CommunicationError('پیام خالی است.');
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_REQUEST){await reader.cancel();throw new CommunicationError('حجم درخواست بیش از حد مجاز است.',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const contentType=request.headers.get('content-type')||'';
 if(contentType.startsWith('multipart/form-data')){
  let form:FormData;try{form=await new Response(bytes,{headers:{'Content-Type':contentType}}).formData();}catch{throw new CommunicationError('فرم فایل نامعتبر است.');}
  if(form.getAll('file').length>1)throw new CommunicationError('در هر پیام یک فایل ارسال کنید.');
  let payload:unknown;try{payload=JSON.parse(String(form.get('payload')));}catch{throw new CommunicationError('اطلاعات پیام نامعتبر است.');}
  const file=form.get('file');
  if(file!==null&&!(file instanceof File))throw new CommunicationError('فایل نامعتبر است.');
  return {payload,...(file instanceof File&&file.name?{attachment:await validateTicketFile(file)}:{})};
 }
 try{return {payload:JSON.parse(new TextDecoder().decode(bytes))};}catch{throw new CommunicationError('اطلاعات پیام نامعتبر است.');}
}
