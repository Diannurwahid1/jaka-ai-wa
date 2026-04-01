"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const MIN_OVERLAY_MS = 850;

function shouldHandleNavigation(event: MouseEvent) {
  if (event.defaultPrevented) {
    return false;
  }

  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }

  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) {
    return false;
  }

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) {
    return false;
  }

  const current = `${window.location.pathname}${window.location.search}`;
  const next = `${url.pathname}${url.search}`;

  return current !== next;
}

export function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const startedAtRef = useRef(0);
  const waitingForPathChangeRef = useRef(false);
  const currentPathRef = useRef(pathname);

  useEffect(() => {
    currentPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!shouldHandleNavigation(event)) {
        return;
      }

      waitingForPathChangeRef.current = true;
      startedAtRef.current = Date.now();
      setVisible(true);
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, []);

  useEffect(() => {
    if (!waitingForPathChangeRef.current) {
      return;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, MIN_OVERLAY_MS - elapsed);

    const timeout = window.setTimeout(() => {
      setVisible(false);
      waitingForPathChangeRef.current = false;
    }, remaining);

    return () => window.clearTimeout(timeout);
  }, [pathname]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(18,115,105,0.16),_transparent_38%),rgba(244,239,231,0.94)] backdrop-blur-[3px]">
      <div className="pointer-events-none flex flex-col items-center px-6 text-center">
        <div className="relative flex items-end justify-center">
          <div className="absolute inset-x-[18%] bottom-6 h-10 rounded-full bg-slate-950/12 blur-2xl" />
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="relative z-10 h-[240px] w-[240px] object-contain object-bottom drop-shadow-[0_24px_50px_rgba(15,23,42,0.16)] sm:h-[320px] sm:w-[320px]"
          >
            <source src="/video/lari-jakaai.webm" type="video/webm" />
          </video>
        </div>
        <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          <span>Sedang memuat</span>
          <span className="jaka-loading-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
