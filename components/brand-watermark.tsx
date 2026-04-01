import Link from "next/link";

type BrandWatermarkProps = {
  compact?: boolean;
  className?: string;
};

export function BrandWatermark({ compact = false, className = "" }: BrandWatermarkProps) {
  return (
    <div
      className={
        compact
          ? `text-center text-xs text-slate-500 ${className}`.trim()
          : `pointer-events-none fixed bottom-4 left-4 z-40 rounded-full border border-slate-200/70 bg-white/85 px-4 py-2 text-xs text-slate-600 shadow-sm backdrop-blur ${className}`.trim()
      }
    >
      <span className={compact ? "" : "pointer-events-auto"}>
        Developed by{" "}
        <Link
          href="https://diannurwahid.com"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-slate-950 underline decoration-slate-300 underline-offset-4"
        >
          diannurwahid.com
        </Link>
      </span>
    </div>
  );
}
