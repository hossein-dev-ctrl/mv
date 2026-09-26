import {z} from 'zod';
const text=z.string().trim().min(3).max(1000);
export const questionInput=z.discriminatedUnion('type',[
 z.object({type:z.literal('TEXT'),prompt:text}),
 z.object({type:z.literal('CHOICE'),prompt:text,options:z.array(z.string().trim().min(1).max(500)).length(4).refine(v=>new Set(v).size===4,'گزینه‌ها باید متفاوت باشند.'),correctOption:z.number().int().min(0).max(3)}),
]);
export type ExamQuestion=z.infer<typeof questionInput>;
export type PublicQuestion={type:'TEXT';prompt:string}|{type:'CHOICE';prompt:string;options:string[]};
export function normalizeQuestions(raw:unknown):ExamQuestion[]{
 if(!Array.isArray(raw))throw Error('ساختار آزمون نامعتبر است.');
 return raw.map(q=>questionInput.parse(typeof q==='string'?{type:'TEXT',prompt:q}:q));
}
export function publicQuestions(raw:unknown):PublicQuestion[]{return normalizeQuestions(raw).map(q=>q.type==='TEXT'?{type:q.type,prompt:q.prompt}:{type:q.type,prompt:q.prompt,options:q.options});}
export function checkAnswers(questions:ExamQuestion[],answers:string[]){
 if(questions.length!==answers.length)throw Error('به همهٔ سؤال‌ها پاسخ دهید.');
 for(let i=0;i<questions.length;i++)if(questions[i].type==='CHOICE'&&!/^[0-3]$/.test(answers[i]))throw Error('یکی از چهار گزینه را انتخاب کنید.');
}
export function scoreExam(raw:unknown,answers:string[],essayScore?:number):number|null{
 const questions=normalizeQuestions(raw);checkAnswers(questions,answers);
 const essays=questions.filter(q=>q.type==='TEXT').length;
 if(essays&&essayScore===undefined)return null;
 const correct=questions.reduce((sum,q,i)=>sum+(q.type==='CHOICE'&&q.correctOption===Number(answers[i])?1:0),0);
 return Math.round((correct*100+essays*(essayScore??0))/questions.length);
}
export function displayAnswer(question:PublicQuestion,answer:string){return question.type==='CHOICE'?question.options[Number(answer)]??'گزینهٔ نامعتبر':answer;}
