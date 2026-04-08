"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { ChatIcon, CreatorIcon, DashboardIcon, KnowledgeIcon, MonitorIcon, SettingsIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon, tourId: "nav-dashboard" },
  {
    href: "/jaka-creator",
    label: "Jaka Creator",
    icon: CreatorIcon,
    tourId: "nav-jaka-creator",
    children: [
      { href: "/jaka-creator/threads", label: "Threads" },
      { href: "/jaka-creator/instagram", label: "Instagram" },
      { href: "/jaka-creator/linkedin", label: "LinkedIn" },
      { href: "/jaka-creator/facebook", label: "Facebook" }
    ]
  },
  { href: "/ai-chat", label: "AI Chat", icon: ChatIcon, tourId: "nav-ai-chat" },
  { href: "/wa-monitor", label: "WA Monitor", icon: MonitorIcon, tourId: "nav-wa-monitor" },
  { href: "/knowledge-base", label: "Knowledge", icon: KnowledgeIcon, tourId: "nav-knowledge" },
  { href: "/settings", label: "Settings", icon: SettingsIcon, tourId: "nav-settings" }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMobileOpen(false);
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/login`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  const navContent = (
    <>
      <div className="space-y-8">
        <div data-tour="sidebar-brand" className="space-y-2">
          <div className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            WA AI Ops
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Control Center</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              AI, backend, WA Blast, memory, dan knowledge base dalam satu panel ringan.
            </p>
          </div>
        </div>

        <nav className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <div key={item.href} className="space-y-2">
                <Link
                  href={item.href}
                  data-tour={item.tourId}
                  onClick={closeMobileMenu}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-slate-950 text-white shadow-panel"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  )}
                >
                  <Icon />
                  <span>{item.label}</span>
                </Link>

                {item.children && active ? (
                  <div className="space-y-1 pl-4">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={closeMobileMenu}
                          className={cn(
                            "flex items-center rounded-2xl px-4 py-2.5 text-sm transition",
                            childActive
                              ? "bg-white font-medium text-slate-950 shadow-sm"
                              : "text-slate-500 hover:bg-white hover:text-slate-950"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-950">Undang teman</p>
          <p className="mt-2 leading-6">
            Bagikan akses panel ini dengan menyalin link login.
          </p>
          <button
            type="button"
            onClick={handleCopyLink}
            className="mt-4 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-950 hover:text-white"
          >
            {copied ? "Link tersalin" : "Copy link"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:opacity-60"
        >
          {loggingOut ? "Keluar..." : "Logout"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-sand/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">WA AI Ops</p>
            <h1 className="truncate text-lg font-semibold text-slate-950">Control Center</h1>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm"
          >
            Menu
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={closeMobileMenu}
            className="absolute inset-0 bg-slate-950/30"
          />
          <div className="absolute inset-y-0 left-0 w-[88vw] max-w-sm overflow-y-auto border-r border-slate-200/70 bg-sand px-5 py-6 shadow-2xl">
            <div className="flex min-h-full flex-col justify-between gap-6">{navContent}</div>
          </div>
        </div>
      ) : null}

      <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r border-slate-200/70 bg-sand/80 px-5 py-6 backdrop-blur lg:block">
        <div className="flex min-h-full flex-col justify-between gap-6">{navContent}</div>
      </aside>
    </>
  );
}
