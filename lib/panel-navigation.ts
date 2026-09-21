export type NavItem = { href: string; label: string };
export function panelNavigation(role?: string): NavItem[] {
  if (role === "ADMIN") return [
    {href:"/admin",label:"پنل مدیر"}, {href:"/admin/courses",label:"دوره‌ها و پیشرفت"},
    {href:"/admin/users",label:"کاربران"}, {href:"/admin/finance",label:"مالی کل"}, {href:"/admin/settlements",label:"تسویه و بازپرداخت"},
    {href:"/tickets",label:"تیکت‌ها"}, {href:"/admin/notifications",label:"ارسال اعلان"},
  ];
  return [
    ...(role === "TEACHER" ? [{href:"/teacher",label:"مدیریت دوره‌های من"},{href:"/teacher/finance",label:"درآمد دوره‌های من"}] : []),
    ...(role ? [{href:"/dashboard",label:"دوره‌های ثبت‌نام‌شده"},{href:"/payments",label:"سوابق پرداخت من"}] : []),
    ...(role ? [{href:"/tickets",label:"تیکت‌های من"}] : []),
    {href:"/courses",label:"همهٔ دوره‌ها"},
  ];
}
export function activeNavigation(path: string, items: NavItem[], role?: string) {
  const mapped = role === "ADMIN" && path.startsWith("/teacher/courses/") ? "/admin/courses" : path.startsWith("/payment/") ? "/payments" : path;
  return items.filter(item=>mapped===item.href || mapped.startsWith(item.href+"/")).sort((a,b)=>b.href.length-a.href.length)[0]?.href;
}
