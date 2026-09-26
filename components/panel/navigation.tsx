"use client";
import ThemeIcon,{relatedIcon} from "@/components/panel/theme-icon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeNavigation, type NavItem } from "@/lib/panel-navigation";
export default function Navigation({items,role}:{items:NavItem[];role?:string}) {
  const active = activeNavigation(usePathname(),items,role);
  return <nav aria-label="ناوبری پنل" className="theme-navigation flex flex-wrap gap-2">{items.map(item=><Link key={item.href} href={item.href} aria-current={item.href===active?"page":undefined} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${item.href===active?"bg-indigo-600 text-white shadow-sm":"text-indigo-100 hover:bg-white/10"}`}><ThemeIcon name={relatedIcon(item.label)} className="h-4 w-4"/>{item.label}</Link>)}</nav>;
}
