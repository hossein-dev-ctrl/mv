import {z} from 'zod';
export const prerequisitesInput=z.array(z.object({title:z.string().trim().min(2).max(200),courseId:z.string().min(1).optional()})).max(20);
export type Prerequisite=z.infer<typeof prerequisitesInput>[number];
export function readPrerequisites(raw:unknown):Prerequisite[]{const result=prerequisitesInput.safeParse(raw);return result.success?result.data:[];}
