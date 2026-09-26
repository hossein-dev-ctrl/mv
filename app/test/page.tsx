
import ThemeIcon from '@/components/panel/theme-icon';
import Link from "next/link";

export default function TestPage() {
  return (
    <div className="p-10">
      <Link rel="noreferrer" href="/test2"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>
        برو به تست ۲
      </Link>
      <div>
        <a href="/test2" rel="noreferrer" target="_blank">
          دانلود
        </a>
      </div>
    </div>
  );
}
