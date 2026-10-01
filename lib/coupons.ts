import {coursePrice} from '@/lib/course-price';
export function couponPrice(course:{id:string;price:number;discountPercent:number},coupon:{active:boolean;courseId:string|null;percent:number}|null,code:string){
 if(code&&(!coupon||!coupon.active||(coupon.courseId&&coupon.courseId!==course.id)))throw Error('کد تخفیف نامعتبر یا غیرفعال است.');
 // Coupon applies to the currently advertised price; amounts are whole tomans.
 const base=coursePrice(course);const percent=code&&coupon?coupon.percent:0;
 if(!Number.isInteger(percent)||percent<0||percent>100)throw Error('درصد تخفیف نامعتبر است.');
 return {base,percent,amount:Math.floor(base*(100-percent)/100)};
}
export function couponCode(value:unknown){if(value===undefined||value==='')return '';if(typeof value!=='string'||!/^[A-Za-z0-9_-]{3,40}$/.test(value.trim()))throw Error('کد باید ۳ تا ۴۰ حرف یا عدد انگلیسی باشد.');return value.trim().toUpperCase();}
