"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { JakaAssistant } from "@/components/jaka-assistant";
import { JakaLoginGreeting } from "@/components/jaka-login-greeting";
import { RouteLoadingOverlay } from "@/components/route-loading-overlay";
import { Sidebar } from "@/components/sidebar";
import { SiteFooter } from "@/components/site-footer";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicStandalonePage =
    pathname === "/login" ||
    pathname === "/legal" ||
    pathname === "/privacy-policy" ||
    pathname === "/terms-of-service" ||
    pathname === "/data-deletion";

  if (isPublicStandalonePage) {
    return <div className="min-h-screen bg-canvas bg-glow text-ink">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-canvas bg-glow text-ink">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar />
        <div className="flex min-h-screen flex-col">
          <main className="flex-1 px-4 py-5 pb-28 sm:px-8 sm:py-6 sm:pb-28 lg:px-10 lg:pb-10">{children}</main>
          <SiteFooter />
        </div>
      </div>
      <RouteLoadingOverlay />
      <JakaLoginGreeting />
      <JakaAssistant />
    </div>
  );
}
