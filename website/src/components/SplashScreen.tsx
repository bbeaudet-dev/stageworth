"use client";

import Image from "next/image";
import { useLayoutEffect, useState } from "react";
import { BRAND_GRADIENT_STYLE } from "@/lib/brand-colors";

const STORAGE_KEY = "td-splash-shown";
const DISPLAY_MS = 720;
const FADE_MS = 280;

type Phase = "show" | "hide" | "gone";

export function SplashScreen() {
  const [phase, setPhase] = useState<Phase>("show");

  useLayoutEffect(() => {
    let displayTimer: number | undefined;
    let fadeTimer: number | undefined;

    const clearTimers = () => {
      if (displayTimer !== undefined) window.clearTimeout(displayTimer);
      if (fadeTimer !== undefined) window.clearTimeout(fadeTimer);
      displayTimer = undefined;
      fadeTimer = undefined;
    };

    const finishSplash = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      setPhase("hide");
      fadeTimer = window.setTimeout(() => {
        setPhase("gone");
        fadeTimer = undefined;
      }, FADE_MS);
    };

    const runSplashSequence = () => {
      clearTimers();
      try {
        if (sessionStorage.getItem(STORAGE_KEY)) {
          setPhase("gone");
          return;
        }
      } catch {
        setPhase("gone");
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* ignore */
        }
        setPhase("gone");
        return;
      }

      setPhase("show");
      displayTimer = window.setTimeout(() => {
        displayTimer = undefined;
        finishSplash();
      }, DISPLAY_MS);
    };

    runSplashSequence();

    const onPageShow = (e: PageTransitionEvent) => {
      try {
        if (sessionStorage.getItem(STORAGE_KEY)) {
          clearTimers();
          setPhase("gone");
          return;
        }
      } catch {
        clearTimers();
        setPhase("gone");
        return;
      }
      if (e.persisted) {
        runSplashSequence();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => {
      clearTimers();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center transition-opacity ease-out ${
        phase === "hide"
          ? "pointer-events-none opacity-0 duration-300"
          : "opacity-100 duration-0"
      }`}
      style={BRAND_GRADIENT_STYLE}
      aria-hidden
    >
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={112}
        height={112}
        priority
        className="rounded-full shadow-2xl shadow-black/25"
      />
      <p className="mt-6 text-sm font-semibold tracking-[0.18em] text-white/95 uppercase">
        Theatre Diary
      </p>
    </div>
  );
}
