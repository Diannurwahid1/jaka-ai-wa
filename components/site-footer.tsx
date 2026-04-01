import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/70 bg-white/45 px-4 py-4 text-center text-xs text-slate-500 backdrop-blur sm:px-6">
      <span>
        Copyright © {year} WA AI Control Center. Developed by{" "}
        <Link
          href="https://diannurwahid.com"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4"
        >
          diannurwahid.com
        </Link>
      </span>
    </footer>
  );
}
