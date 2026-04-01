import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  detail,
  tone = "default",
  icon
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "accent" | "warn";
  icon?: ReactNode;
}) {
  const tones = {
    default: "bg-white",
    accent: "bg-accent text-white",
    warn: "bg-[#fff1df]"
  };

  return (
    <div className={`${tones[tone]} rounded-[24px] border border-slate-200/60 p-4 shadow-panel sm:rounded-[28px] sm:p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm ${tone === "accent" ? "text-white/80" : "text-slate-500"}`}>{label}</p>
          <p className="mt-2 text-[28px] font-semibold tracking-tight sm:mt-3 sm:text-3xl">{value}</p>
          <p className={`mt-2 text-sm leading-6 ${tone === "accent" ? "text-white/75" : "text-slate-600"} sm:mt-3`}>{detail}</p>
        </div>
        {icon ? (
          <div
            className={`rounded-2xl p-2.5 sm:p-3 ${
              tone === "accent" ? "bg-white/15 text-white" : "bg-slate-950 text-white"
            }`}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
