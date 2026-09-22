export function notificationScope(role:string,value:unknown):'PERSONAL'|'SYSTEM'|undefined {
 return role==='ADMIN'&&(value==='PERSONAL'||value==='SYSTEM')?value:undefined;
}
