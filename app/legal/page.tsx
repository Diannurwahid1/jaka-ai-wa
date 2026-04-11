import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal | WA AI Control Center",
  description: "Halaman legal publik untuk Privacy Policy dan Terms of Service WA AI Control Center."
};

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f1e8_0%,#efe7da_38%,#f8f5ef_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[36px] border border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(31,41,55,0.12)] backdrop-blur">
          <section className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(21,128,61,0.86))] px-6 py-12 text-white sm:px-10">
            <p className="text-xs uppercase tracking-[0.32em] text-white/70">Public Legal</p>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Legal Center</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
              Halaman ini disediakan untuk kebutuhan verifikasi dan kepatuhan integrasi aplikasi dengan Meta, Threads,
              dan LinkedIn. Dokumen legal di bawah dapat diakses publik tanpa login.
            </p>
          </section>

          <section className="grid gap-6 px-6 py-8 sm:px-10 lg:grid-cols-2">
            <Link
              href="/privacy-policy"
              className="rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-6 transition hover:border-emerald-500 hover:bg-emerald-50"
            >
              <p className="text-xs uppercase tracking-[0.26em] text-emerald-700">Privacy</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Privacy Policy</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Menjelaskan data yang diproses, dasar penggunaan data, retensi, keamanan, dan kontak privasi.
              </p>
            </Link>

            <Link
              href="/terms-of-service"
              className="rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-6 transition hover:border-sky-500 hover:bg-sky-50"
            >
              <p className="text-xs uppercase tracking-[0.26em] text-sky-700">Terms</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Terms of Service</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Menjelaskan syarat penggunaan layanan, tanggung jawab pengguna, batasan layanan, dan kepatuhan platform.
              </p>
            </Link>

            <Link
              href="/data-deletion"
              className="rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-6 transition hover:border-rose-500 hover:bg-rose-50 lg:col-span-2"
            >
              <p className="text-xs uppercase tracking-[0.26em] text-rose-700">Meta Requirement</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Data Deletion Instructions</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Halaman publik untuk menjelaskan cara pengguna meminta penghapusan data dari aplikasi ini, sesuai
                persyaratan Meta App Review.
              </p>
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
