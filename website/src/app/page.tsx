import Image from "next/image";
import { BRAND_BLUE, BRAND_PURPLE, BRAND_GRADIENT_STYLE } from "@/lib/brand-colors";
import { TESTFLIGHT_PUBLIC_URL } from "@/lib/testflight";

/** Display size for Next/Image; assets are 718×1428 (device screenshots). */
const SHOT_WIDTH = 359;
const SHOT_HEIGHT = 714;

const FEATURES = [
  {
    title: "Browse what’s on",
    imageSrc: "/screenshots/theatrediary2.jpg",
    imageAlt: "Show detail screen in Theatre Diary",
  },
  {
    title: "Log & rank every show",
    imageSrc: "/screenshots/theatrediary4.jpg",
    imageAlt: "Logging and tracking shows you have seen in Theatre Diary",
  },
  {
    title: "Follow friends & share",
    imageSrc: "/screenshots/theatrediary1.jpg",
    imageAlt: "Theatre Diary community feed with posts from friends",
  },
  {
    title: "Plan theatre trips",
    imageSrc: "/screenshots/theatrediary5.jpg",
    imageAlt: "Trip planning in Theatre Diary",
  },
] as const;

export default function HomePage() {
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
            Theatre Diary helps you track every show you see, rank your
            favorites, plan trips with friends, and stay on top of what&apos;s
            playing.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href={TESTFLIGHT_PUBLIC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-white/15 border border-white/25 px-4 py-2 text-sm font-medium backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
              Join the TestFlight beta
            </a>
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

      {/* CTA — TestFlight public link (works on iPhone with TestFlight installed) */}
      <section className="border-t border-gray-200 bg-linear-to-b from-gray-50 to-white py-16">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Join the iOS beta
          </h2>
          <p className="text-gray-600 mb-2 max-w-xl mx-auto">
            Install Apple&apos;s{" "}
            <span className="font-medium text-gray-800">TestFlight</span> app,
            then tap the button below to install Theatre Diary.
          </p>
          <a
            href={TESTFLIGHT_PUBLIC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-md hover:opacity-95 transition-opacity"
            style={{
              background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, ${BRAND_PURPLE} 100%)`,
            }}
          >
            Open TestFlight invite
          </a>
        </div>
      </section>

    </div>
  );
}
