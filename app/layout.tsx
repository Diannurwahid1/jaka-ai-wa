import type { Metadata } from "next";
import "driver.js/dist/driver.css";

import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "WA AI Control Center",
  description: "Dashboard AI WhatsApp auto reply berbasis Next.js dan WA Blast.",
  icons: {
    icon: "/logo.ico",
    shortcut: "/logo.ico",
    apple: "/logo.ico"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
