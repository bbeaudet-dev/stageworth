import Image from "next/image";
import {
  AndroidApkButton,
  TestFlightButton,
} from "@/components/DownloadPlatformButtons";
import { getAndroidApkUrl } from "@/lib/app-downloads";
import { BRAND_PURPLE, BRAND_GRADIENT_STYLE } from "@/lib/brand-colors";

/** Display size for Next/Image; assets are 718×1428 (device screenshots). */
const SHOT_WIDTH = 359;
const SHOT_HEIGHT = 714;

const FEATURES = [
  {
    title: "Browse what’s on",
    imageSrc: "/screenshots/stageworth2.jpg",
    imageAlt: "Show detail screen in Stageworth",
  },
  {
    title: "Log & rank every show",
    imageSrc: "/screenshots/stageworth4.jpg",
    imageAlt: "Logging and tracking shows you have seen in Stageworth",
  },
  {
    title: "Follow friends & share",
    imageSrc: "/screenshots/stageworth1.jpg",
    imageAlt: "Stageworth community feed with posts from friends",
  },
  {
    title: "Plan theatre trips",
    imageSrc: "/screenshots/stageworth5.jpg",
    imageAlt: "Trip planning in Stageworth",
  },
] as const;

export default function HomePage() {
  const hasAndroidApk = Boolean(getAndroidApkUrl());

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden text-white"
        style={BRAND_GRADIENT_STYLE}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 20% 10%, rgba(255,255,255,0.12), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 90%, ${BRAND_PURPLE}, transparent 45%)`,
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 py-24 sm:py-32 text-center">
          <div className="mb-8 flex justify-center">
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={88}
              height={88}
              priority
              className="rounded-full shadow-lg shadow-black/20 ring-2 ring-white/25"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Your theatre life,
            <br />
            <span className="text-white/90">all in one place.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/85 max-w-2xl mx-auto mb-10">
            Stageworth helps you track every show you see, rank your
            favorites, plan trips with friends, and stay on top of what&apos;s
            playing.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <TestFlightButton />
            <AndroidApkButton />
          </div>
        </div>
      </section>

      {/* Features + screenshots */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 bg-linear-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Everything a theatregoer needs
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col items-center text-center">
                <div className="relative w-full max-w-[280px] rounded-4xl overflow-hidden shadow-xl shadow-gray-900/15 ring-1 ring-black/6 bg-gray-900/5">
                  <Image
                    src={feature.imageSrc}
                    alt={feature.imageAlt}
                    width={SHOT_WIDTH}
                    height={SHOT_HEIGHT}
                    sizes="(max-width: 640px) 280px, (max-width: 1280px) 42vw, 22vw"
                    className="w-full h-auto object-cover object-top"
                  />
                </div>
                <div className="mt-4">
                  <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — per-platform instructions */}
      <section className="border-t border-gray-200 bg-linear-to-b from-gray-50 to-white py-16">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h2 className="text-2xl font-bold mb-12 text-gray-900">
            Get the beta
          </h2>

          <div
            className={`mx-auto grid max-w-3xl gap-10 ${
              hasAndroidApk ? "md:grid-cols-2" : "md:max-w-md md:grid-cols-1"
            }`}
          >
            {/* iOS */}
            <div className="flex flex-col items-center text-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">iPhone &amp; iPad</h3>
              <p className="text-gray-600 text-[15px] leading-relaxed max-w-xs">
                Install Apple&apos;s{" "}
                <span className="font-medium text-gray-800">TestFlight</span>{" "}
                app from the App Store, then tap below to join the beta.
              </p>
              <TestFlightButton />
            </div>

            {/* Android */}
            {hasAndroidApk ? (
              <div className="flex flex-col items-center text-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">Android</h3>
                <p className="text-gray-600 text-[15px] leading-relaxed max-w-xs">
                  Opens the latest build on{" "}
                  <span className="font-medium text-gray-800">Expo</span>.
                  Download the <span className="font-medium text-gray-800">.apk</span>{" "}
                  and install it &mdash; you may need to allow installs from
                  unknown sources.
                </p>
                <AndroidApkButton />
              </div>
            ) : null}
          </div>
        </div>
      </section>

    </div>
  );
}
