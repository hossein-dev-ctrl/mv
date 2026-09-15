export const latinDigits=(value:string)=>value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[٬,]/g,'');
export const faDigits=(value:string|number)=>String(value).replace(/\d/g,c=>'۰۱۲۳۴۵۶۷۸۹'[Number(c)]);
const ones=['','یک','دو','سه','چهار','پنج','شش','هفت','هشت','نه','ده','یازده','دوازده','سیزده','چهارده','پانزده','شانزده','هفده','هجده','نوزده'];
const tens=['','','بیست','سی','چهل','پنجاه','شصت','هفتاد','هشتاد','نود'];
const hundreds=['','صد','دویست','سیصد','چهارصد','پانصد','ششصد','هفتصد','هشتصد','نهصد'];
function group(n:number):string {const parts=[];if(n>=100){parts.push(hundreds[Math.floor(n/100)]);n%=100;}if(n>=20){parts.push(tens[Math.floor(n/10)]);n%=10;}if(n)parts.push(ones[n]);return parts.join(' و ');}
export function numberWords(input:string|number):string {
 const text=latinDigits(String(input)).trim();if(!text)return '';const n=Number(text);
 if(!Number.isSafeInteger(n))return '';
 if(n===0)return 'صفر';let value=Math.abs(n),i=0;const parts=[];const scales=['','هزار','میلیون','میلیارد','تریلیون','کوادریلیون'];
 while(value){const part=value%1000;if(part)parts.unshift(`${group(part)}${scales[i]?' '+scales[i]:''}`);value=Math.floor(value/1000);i++;}
 return (n<0?'منفی ':'')+parts.join(' و ');
}
