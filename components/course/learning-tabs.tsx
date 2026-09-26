'use client';
import {useId,useState,type ReactNode} from 'react';
import ThemeIcon,{type IconName} from '@/components/panel/theme-icon';
export default function LearningTabs({panels}:{panels:{title:string;icon:IconName;content:ReactNode}[]}){
 const [active,setActive]=useState(0),id=useId();
 return <><div role="tablist" aria-label="بخش‌های درس" className="learning-tabs">{panels.map((p,i)=><button key={p.title} role="tab" id={`${id}-tab-${i}`} aria-controls={`${id}-panel-${i}`} aria-selected={active===i} tabIndex={active===i?0:-1} onClick={()=>setActive(i)} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?panels.length-1:(i+(e.key==='ArrowLeft'?1:-1)+panels.length)%panels.length;setActive(n);document.getElementById(`${id}-tab-${n}`)?.focus();}} className={active===i?'active':''}><ThemeIcon name={p.icon} className="h-5 w-5"/>{p.title}</button>)}</div>{panels.map((p,i)=><section key={p.title} role="tabpanel" tabIndex={0} id={`${id}-panel-${i}`} aria-labelledby={`${id}-tab-${i}`} hidden={active!==i}>{p.content}</section>)}</>;
}
