import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion Instructions | WA AI Control Center",
  description: "Instruksi publik untuk meminta penghapusan data pengguna dari WA AI Control Center sesuai persyaratan Meta."
};

function DeletionSection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-slate-50/80 px-5 py-5 sm:px-6">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-650">{children}</div>
    </section>
  );
}

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f1e8_0%,#efe7da_38%,#f8f5ef_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[36px] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(31,41,55,0.12)] backdrop-blur">
          <section className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(190,24,93,0.82))] px-6 py-12 text-white sm:px-10">
            <p className="text-xs uppercase tracking-[0.32em] text-white/70">Meta Data Deletion</p>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Data Deletion Instructions</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
              Halaman ini menjelaskan cara pengguna meminta penghapusan data yang diproses oleh WA AI Control Center,
              termasuk data yang diperoleh melalui integrasi Meta, Facebook, Instagram, dan Threads.
            </p>
            <p className="mt-4 text-sm text-white/70">Last updated: April 10, 2026</p>
          </section>

          <div className="space-y-5 px-6 py-8 sm:px-10">
            <DeletionSection title="1. Cara Mengajukan Penghapusan Data">
              <p>
                Pengguna dapat meminta penghapusan data dengan menghubungi administrator layanan atau pengelola aplikasi
                yang mengoperasikan WA AI Control Center melalui kanal resmi organisasi terkait.
              </p>
              <p>
                Permintaan sebaiknya menyertakan identitas akun yang relevan, misalnya nama akun, nomor WhatsApp, atau
                identifier platform yang dipakai saat berinteraksi dengan layanan.
              </p>
            </DeletionSection>

            <DeletionSection title="2. Data Yang Dapat Dihapus">
              <p>
                Permintaan penghapusan dapat mencakup log pesan, memory session, histori approval, histori publish, dan
                metadata integrasi yang masih tersimpan di sistem, sepanjang tidak dibutuhkan lagi untuk kewajiban hukum,
                keamanan, atau audit yang masih berlaku.
              </p>
            </DeletionSection>

            <DeletionSection title="3. Proses Verifikasi">
              <p>
                Untuk mencegah penghapusan yang tidak sah, administrator dapat meminta verifikasi identitas yang wajar
                sebelum memproses permintaan.
              </p>
            </DeletionSection>

            <DeletionSection title="4. Waktu Penanganan">
              <p>
                Permintaan akan ditinjau dan diproses dalam waktu yang wajar sesuai kompleksitas data dan kebijakan
                internal organisasi yang menggunakan aplikasi ini.
              </p>
            </DeletionSection>

            <DeletionSection title="5. Kontak">
              <p>
                Jika Anda membutuhkan penghapusan data, silakan hubungi kanal operasional resmi organisasi atau
                administrator sistem yang menyediakan layanan ini. Jika organisasi menampilkan email atau formulir khusus,
                gunakan kanal tersebut sebagai sarana resmi pengajuan.
              </p>
            </DeletionSection>

            <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-2 text-sm text-slate-600">
              <Link href="/legal" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">
                Legal Center
              </Link>
              <Link href="/privacy-policy" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
