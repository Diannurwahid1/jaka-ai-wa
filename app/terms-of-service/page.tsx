import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | WA AI Control Center",
  description: "Terms of Service publik untuk integrasi Meta, Threads, dan LinkedIn pada WA AI Control Center."
};

function TermsSection({
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

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f1e8_0%,#efe7da_38%,#f8f5ef_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[36px] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(31,41,55,0.12)] backdrop-blur">
          <section className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(14,116,144,0.86))] px-6 py-12 text-white sm:px-10">
            <p className="text-xs uppercase tracking-[0.32em] text-white/70">Legal Document</p>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Terms of Service</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
              Syarat penggunaan ini berlaku untuk akses dan penggunaan WA AI Control Center, termasuk modul WhatsApp,
              Meta, Threads, LinkedIn, AI, memory, dan automation yang tersedia di dalam aplikasi.
            </p>
            <p className="mt-4 text-sm text-white/70">Last updated: April 10, 2026</p>
          </section>

          <div className="space-y-5 px-6 py-8 sm:px-10">
            <TermsSection title="1. Penerimaan">
              <p>
                Dengan menggunakan aplikasi ini, Anda menyatakan berwenang menggunakan akun, token, nomor, dan aset
                digital yang dikoneksikan ke sistem.
              </p>
            </TermsSection>

            <TermsSection title="2. Penggunaan Yang Diizinkan">
              <p>
                Anda setuju menggunakan aplikasi hanya untuk keperluan yang sah, sesuai kebijakan platform terkait, dan
                tidak untuk spam, penipuan, penyalahgunaan automasi, atau pelanggaran hak pihak lain.
              </p>
              <p>
                Anda bertanggung jawab penuh atas konten yang dipublikasikan, pesan yang dikirim, dan data pihak ketiga
                yang diolah melalui sistem.
              </p>
            </TermsSection>

            <TermsSection title="3. Akun Dan Kredensial">
              <p>
                Anda wajib menjaga kerahasiaan token akses, secret, password admin, dan kredensial integrasi. Semua
                aktivitas yang terjadi melalui kredensial tersebut menjadi tanggung jawab pemilik akun atau organisasi
                pengguna.
              </p>
            </TermsSection>

            <TermsSection title="4. Integrasi Pihak Ketiga">
              <p>
                Fitur Meta, Threads, dan LinkedIn bergantung pada API dan kebijakan platform masing-masing. Perubahan
                policy, rate limit, pencabutan token, atau error platform dapat memengaruhi fungsi aplikasi tanpa
                pemberitahuan sebelumnya.
              </p>
            </TermsSection>

            <TermsSection title="5. Ketersediaan Dan Batasan">
              <p>
                Layanan disediakan sebagaimana adanya. Kami tidak menjamin semua fitur selalu tersedia, bebas gangguan,
                atau cocok untuk kebutuhan hukum, komersial, maupun operasional tertentu.
              </p>
              <p>
                Scheduled publishing, webhook, dan automation bergantung pada koneksi, cron, token aktif, dan layanan
                pihak ketiga yang digunakan.
              </p>
            </TermsSection>

            <TermsSection title="6. Tanggung Jawab Konten">
              <p>
                Pengguna wajib memeriksa dan memvalidasi konten sebelum dipublish. Anda tidak boleh mengandalkan output AI
                sebagai nasihat hukum, keuangan, medis, atau pernyataan resmi tanpa review manusia yang memadai.
              </p>
            </TermsSection>

            <TermsSection title="7. Penghentian Akses">
              <p>
                Akses dapat dibatasi, dinonaktifkan, atau dihentikan jika ditemukan penyalahgunaan, pelanggaran kebijakan,
                atau risiko keamanan yang signifikan.
              </p>
            </TermsSection>

            <TermsSection title="8. Kontak">
              <p>
                Untuk pertanyaan legal atau kepatuhan platform, hubungi administrator atau pengelola sistem pada organisasi
                yang mengoperasikan aplikasi ini.
              </p>
            </TermsSection>

            <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-2 text-sm text-slate-600">
              <Link href="/legal" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">
                Legal Center
              </Link>
              <Link href="/privacy-policy" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
