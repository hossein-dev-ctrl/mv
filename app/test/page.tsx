import Link from "next/link";

export default function TestPage() {
  return (
    <div className="p-10">
      <Link rel="noreferrer" href="/test2">
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
