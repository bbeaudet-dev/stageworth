"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AndroidApkButton,
  AppStoreButton,
  TestFlightButton,
} from "@/components/DownloadPlatformButtons";
import { BRAND_BLUE, BRAND_GRADIENT_STYLE } from "@/lib/brand-colors";
import { APP_STORE_URL, getAndroidApkUrl } from "@/lib/app-downloads";

export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;
  const hasAndroidBuildPage = Boolean(getAndroidApkUrl());

  const [status, setStatus] = useState<"idle" | "opening" | "fallback">("opening");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openInviteDeepLink = useCallback(() => {
    if (!token) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const deepLink = `stageworth://invite/${token}`;
    window.location.href = deepLink;

    timerRef.current = setTimeout(() => {
      setStatus("fallback");
    }, 1500);
  }, [token]);

  useEffect(() => {
    openInviteDeepLink();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [openInviteDeepLink]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div
        className="w-full max-w-md rounded-3xl text-white p-8 text-center shadow-2xl"
        style={BRAND_GRADIENT_STYLE}
      >
        <div className="flex justify-center mb-6">
          <Image
            src="/icons/icon-192.png"
            alt="Stageworth"
            width={72}
            height={72}
            className="rounded-2xl shadow-lg shadow-black/30 ring-2 ring-white/30"
          />
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Stageworth
        </h1>
        <p className="text-white/80 text-base mb-8">
          You&apos;ve been invited to join Stageworth — the app for tracking
          every show you see, ranking your favourites, and sharing with friends.
        </p>

        {status === "fallback" ? (
          <div className="space-y-4">
            <p className="text-sm text-white/70 mb-2">
              Looks like the app isn&apos;t installed yet. Get it here:
            </p>
            <div className="flex w-full flex-col items-center gap-3">
              <AppStoreButton className="w-full" />
              <div className="flex w-full flex-col items-stretch gap-2 pt-1">
                <TestFlightButton className="w-full justify-center py-2.5" />
                <AndroidApkButton className="w-full justify-center py-2.5" />
              </div>
            </div>
            {hasAndroidBuildPage ? (
              <p className="text-xs text-white/55 max-w-sm mx-auto leading-snug">
                Android is still in beta — opens your build on Expo, download
                the <span className="text-white/75 font-medium">.apk</span>{" "}
                from that page to install.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => {
                setStatus("opening");
                openInviteDeepLink();
              }}
              disabled={status === "opening"}
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold shadow-md hover:bg-white/90 transition-colors disabled:opacity-70"
              style={{ color: BRAND_BLUE }}
            >
              {status === "opening" ? "Opening app…" : "Open Stageworth"}
            </button>
            <p className="text-xs text-white/60">
              Don&apos;t have the app?{" "}
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-white transition-colors"
              >
                Get it on the App Store
              </a>
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
