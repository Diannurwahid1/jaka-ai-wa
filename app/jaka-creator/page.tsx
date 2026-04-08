import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { listCreatorPlatforms } from "@/lib/creator";

export default function JakaCreatorPage() {
  const platforms = listCreatorPlatforms();

  return (
    <div>
      <PageHeader
        eyebrow="Jaka AI Creator"
        title="Creator Platform Hub"
        description="Pilih media sosial yang ingin dikelola. Setiap platform punya karakter generator, approval, dan format konten yang berbeda."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {platforms.map((item) => (
          <Link
            key={item.platform}
            href={`/jaka-creator/${item.platform}`}
            className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel transition hover:-translate-y-0.5 hover:border-slate-950/20"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">{item.label}</p>
            <h3 className="mt-3 text-xl font-semibold text-slate-950">{item.platform}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {item.requiresImage ? "Caption + visual AI" : "Text-first thread workflow"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
