import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | WA AI Control Center",
  description: "Privacy Policy publik untuk integrasi Meta, Threads, dan LinkedIn pada WA AI Control Center."
};

function PolicySection({
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

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f1e8_0%,#efe7da_38%,#f8f5ef_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[36px] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(31,41,55,0.12)] backdrop-blur">
          <section className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(13,148,136,0.86))] px-6 py-12 text-white sm:px-10">
            <p className="text-xs uppercase tracking-[0.32em] text-white/70">Legal Document</p>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Privacy Policy</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
              Berlaku untuk WA AI Control Center dan fitur integrasi yang terhubung dengan WhatsApp, Meta Facebook,
              Instagram, Threads, LinkedIn, serta layanan AI dan penyimpanan data yang dikonfigurasi di aplikasi.
            </p>
            <p className="mt-4 text-sm text-white/70">Last updated: April 10, 2026</p>
          </section>

          <div className="space-y-5 px-6 py-8 sm:px-10">
            <PolicySection title="1. Data Yang Diproses">
              <p>
                Aplikasi dapat memproses data operasional seperti nama tampilan, nomor atau identifier akun, isi pesan,
                log aktivitas, token integrasi platform, konten draft, status publish, metadata webhook, dan pengaturan
                koneksi yang diinput administrator.
              </p>
              <p>
                Untuk fitur sosial, aplikasi dapat menerima atau mengirim data melalui API resmi Meta, Threads, dan
                LinkedIn sesuai izin yang diberikan oleh pemilik akun atau administrator yang sah.
              </p>
            </PolicySection>

            <PolicySection title="2. Tujuan Penggunaan Data">
              <p>Data digunakan untuk menjalankan auto reply, moderation, draft approval, scheduled publishing, observability, dan troubleshooting teknis.</p>
              <p>Data juga dapat digunakan untuk menjaga keamanan akun admin, validasi request webhook, dan audit aktivitas sistem.</p>
            </PolicySection>

            <PolicySection title="3. Dasar Akses Platform">
              <p>
                Integrasi dengan Meta, Threads, dan LinkedIn hanya digunakan untuk fungsi yang diminta pengguna, seperti
                validasi koneksi, pengambilan identitas akun, pembuatan draft, dan publikasi konten.
              </p>
              <p>
                Aplikasi tidak menjual data pengguna dan tidak membagikan token akses ke pihak ketiga di luar kebutuhan
                teknis layanan yang sah.
              </p>
            </PolicySection>

            <PolicySection title="4. Penyimpanan Dan Retensi">
              <p>
                Data dapat disimpan di database inti aplikasi, MongoDB, dan log sistem sesuai konfigurasi runtime.
                Retensi ditentukan oleh kebutuhan operasional, histori pesan, histori approval, serta kebutuhan audit dan
                debugging.
              </p>
              <p>
                Administrator bertanggung jawab memastikan masa simpan dan kebijakan internal sesuai regulasi yang berlaku
                pada organisasinya.
              </p>
            </PolicySection>

            <PolicySection title="5. Keamanan">
              <p>
                Aplikasi menggunakan autentikasi admin, validasi secret, pembatasan origin untuk API sensitif, dan
                pemisahan konfigurasi runtime untuk membantu menjaga keamanan akses.
              </p>
              <p>
                Meskipun langkah pengamanan diterapkan, tidak ada sistem transmisi atau penyimpanan digital yang dapat
                dijamin 100% bebas risiko.
              </p>
            </PolicySection>

            <PolicySection title="6. Hak Pengguna Dan Permintaan Data">
              <p>
                Pemilik akun atau organisasi yang menggunakan aplikasi dapat meminta pembaruan, koreksi, atau penghapusan
                data operasional tertentu sepanjang permintaan tersebut tidak bertentangan dengan kewajiban hukum atau
                kebutuhan audit yang masih berlaku.
              </p>
            </PolicySection>

            <PolicySection title="7. Kontak">
              <p>
                Untuk pertanyaan privasi, permintaan data, atau isu kepatuhan platform, hubungi administrator layanan atau
                pengelola aplikasi melalui kanal operasional resmi organisasi Anda.
              </p>
            </PolicySection>

            <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-2 text-sm text-slate-600">
              <Link href="/legal" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">
                Legal Center
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
