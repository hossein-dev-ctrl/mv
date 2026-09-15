"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeNavigation, type NavItem } from "@/lib/panel-navigation";
export default function Navigation({items,role}:{items:NavItem[];role?:string}) {
  const active = activeNavigation(usePathname(),items,role);
  return <nav aria-label="ناوبری پنل" className="flex flex-wrap gap-2">{items.map(item=><Link key={item.href} href={item.href} aria-current={item.href===active?"page":undefined} className={`rounded-xl px-3 py-2 text-sm font-medium transition ${item.href===active?"bg-indigo-600 text-white shadow-sm":"text-slate-600 hover:bg-slate-100"}`}>{item.label}</Link>)}</nav>;
}
