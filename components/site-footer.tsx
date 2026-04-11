import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/70 bg-white/45 px-4 py-4 text-center text-xs text-slate-500 backdrop-blur sm:px-6">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
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
        <Link href="/privacy-policy" className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4">
          Privacy Policy
        </Link>
        <Link href="/terms-of-service" className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4">
          Terms of Service
        </Link>
        <Link href="/data-deletion" className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4">
          Data Deletion
        </Link>
      </div>
    </footer>
  );
}
