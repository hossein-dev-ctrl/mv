type IconName='book'|'users'|'settings'|'chart'|'layers'|'play'|'file';
const paths:Record<IconName,string>={
 book:'M12 5v16M12 5C8 2 4 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-2-1-6-2-10 1Z',
 users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 settings:'m9 3-1 3-3 1-2 3 2 2-1 3 3 2 3-1 2 2 3-1 1-3 3-1 1-3-2-2 1-3-3-2-3 1-2-2-3 1ZM15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 chart:'M4 20V10M10 20V4M16 20v-7M22 20V7',
 layers:'m12 2 10 5-10 5L2 7l10-5ZM2 12l10 5 10-5M2 17l10 5 10-5',
 play:'m10 8 6 4-6 4V8ZM22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
 file:'M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 12h8M8 16h6',
};
export default function ThemeIcon({name,className='h-6 w-6'}:{name:IconName;className?:string}){
 return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={paths[name]}/></svg>;
}
