"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BRAND_BLUE, BRAND_GRADIENT_STYLE, BRAND_PURPLE } from "@/lib/brand-colors";
import { TESTFLIGHT_PUBLIC_URL } from "@/lib/testflight";

export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<"idle" | "opening" | "fallback">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleOpen() {
    if (!token) return;
    setStatus("opening");

    const deepLink = `theatrediary://invite/${token}`;
    window.location.href = deepLink;

    timerRef.current = setTimeout(() => {
      // If we're still here, the app wasn't installed
      setStatus("fallback");
    }, 1500);
  }

  useEffect(() => {
    handleOpen();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Hero card */}
      <div
        className="w-full max-w-md rounded-3xl text-white p-8 text-center shadow-2xl"
        style={BRAND_GRADIENT_STYLE}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-30"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 20% 10%, rgba(255,255,255,0.15), transparent 55%)`,
          }}
          aria-hidden
        />

        <div className="relative flex justify-center mb-6">
          <Image
            src="/icons/icon-192.png"
            alt="Theatre Diary"
            width={72}
            height={72}
            className="rounded-2xl shadow-lg shadow-black/30 ring-2 ring-white/30"
          />
        </div>

        <h1 className="relative text-3xl font-bold tracking-tight mb-2">
          Theatre Diary
        </h1>
        <p className="relative text-white/80 text-base mb-8">
          You&apos;ve been invited to join Theatre Diary — the app for tracking
          every show you see, ranking your favourites, and sharing with friends.
        </p>

        {status === "fallback" ? (
          <div className="relative space-y-3">
            <p className="text-sm text-white/70 mb-4">
              Looks like the app isn&apos;t installed yet. Get it on TestFlight:
            </p>
            <a
              href={TESTFLIGHT_PUBLIC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold shadow-md hover:bg-white/90 transition-colors"
              style={{ color: BRAND_BLUE }}
            >
              Join the iOS Beta (TestFlight)
            </a>
          </div>
        ) : (
          <div className="relative space-y-3">
            <button
              onClick={handleOpen}
              disabled={status === "opening"}
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold shadow-md hover:bg-white/90 transition-colors disabled:opacity-70"
              style={{ color: BRAND_BLUE }}
            >
              {status === "opening" ? "Opening app…" : "Open Theatre Diary"}
            </button>
            <p className="text-xs text-white/60">
              Don&apos;t have the app?{" "}
              <a
                href={TESTFLIGHT_PUBLIC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-white transition-colors"
              >
                Join the iOS beta
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Feature blurbs */}
      <div className="mt-12 max-w-md w-full grid grid-cols-2 gap-4">
        {[
          { emoji: "🎭", title: "Log every show", desc: "Build a personal diary of every performance you attend." },
          { emoji: "⭐", title: "Rank your faves", desc: "Create your all-time ranking and share it with friends." },
          { emoji: "📅", title: "Plan trips", desc: "Organise theatre trips with friends and never miss a show." },
          { emoji: "🏆", title: "Compete", desc: "Climb the leaderboard and see how you compare globally." },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="text-2xl mb-2">{f.emoji}</div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-gray-500 leading-snug">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
