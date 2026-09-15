export function coursePrice(course:{price:number;discountPercent?:number}) {
 const discount=course.discountPercent??0;
 if(!Number.isInteger(discount)||discount<0||discount>100||!Number.isSafeInteger(course.price)||course.price<0)throw new Error('قیمت یا تخفیف نامعتبر است.');
 return Math.floor(course.price*(100-discount)/100);
}
