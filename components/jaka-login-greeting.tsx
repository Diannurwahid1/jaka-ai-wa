"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const GREETING_STORAGE_KEY = "jaka-post-login-greeting";
const GREETING_MESSAGE = "Halo, saya Jaka AI. Ayo mulai jelajahi control center ini.";

export function JakaLoginGreeting() {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    if (pathname === "/login") {
      return;
    }

    const shouldShow = window.sessionStorage.getItem(GREETING_STORAGE_KEY) === "1";

    if (!shouldShow) {
      return;
    }

    setVisible(true);
    setClosing(false);
    setShowBubble(false);
    setTypedText("");

    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [pathname]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const bubbleDelay = window.setTimeout(() => {
      setShowBubble(true);
    }, 300);

    return () => window.clearTimeout(bubbleDelay);
  }, [visible]);

  useEffect(() => {
    if (!showBubble) {
      return;
    }

    let index = 0;
    setTypedText("");

    const typingInterval = window.setInterval(() => {
      index += 1;
      setTypedText(GREETING_MESSAGE.slice(0, index));

      if (index >= GREETING_MESSAGE.length) {
        window.clearInterval(typingInterval);
      }
    }, 34);

    return () => window.clearInterval(typingInterval);
  }, [showBubble]);

  const finishGreeting = useCallback(() => {
    if (closing) {
      return;
    }

    window.sessionStorage.removeItem(GREETING_STORAGE_KEY);
    setClosing(true);

    closeTimeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      window.dispatchEvent(new CustomEvent("jaka:celebration-complete"));
    }, 380);
  }, [closing]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const fallback = window.setTimeout(() => {
      finishGreeting();
    }, 5200);

    return () => window.clearTimeout(fallback);
  }, [visible, finishGreeting]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(18,115,105,0.18),_transparent_40%),rgba(15,23,42,0.18)] px-4 backdrop-blur-[4px] transition duration-300 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`relative w-full max-w-[720px] transition duration-300 ${
          closing ? "translate-y-6 scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100"
        }`}
      >
        {showBubble ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 transition duration-500 animate-[jaka-bubble-in_0.45s_ease-out] sm:top-0 sm:translate-x-[-8%]">
            <div className="relative min-w-[260px] max-w-[320px] rounded-[28px] border border-white/70 bg-white/95 px-5 py-3 text-center text-sm font-medium text-slate-700 shadow-[0_18px_50px_rgba(15,23,42,0.14)] sm:max-w-[360px] sm:px-6 sm:text-base">
              {typedText}
              <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-[jaka-caret_0.9s_steps(1)_infinite] bg-slate-500" />
              <span className="absolute left-1/2 top-full h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-white/70 bg-white/95 sm:left-10 sm:translate-x-0" />
            </div>
          </div>
        ) : null}

        <div className="relative flex items-end justify-center">
          <div className="absolute inset-x-[20%] bottom-6 h-12 rounded-full bg-slate-950/14 blur-3xl sm:inset-x-[24%] sm:bottom-8 sm:h-16" />
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={finishGreeting}
            className="relative z-10 mx-auto h-[420px] w-full object-contain object-bottom drop-shadow-[0_28px_60px_rgba(15,23,42,0.18)] sm:h-[560px]"
          >
            <source src="/video/greating-jakaai.webm" type="video/webm" />
          </video>
        </div>
      </div>
    </div>
  );
}
