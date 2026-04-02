import Image from "next/image";
import { BRAND_BLUE, BRAND_PURPLE, BRAND_GRADIENT_STYLE } from "@/lib/brand-colors";
import { TESTFLIGHT_PUBLIC_URL } from "@/lib/testflight";

const FEATURES = [
  {
    title: "Track Every Show",
    description:
      "Log every show you see with details like date, seat, cast, and more. Build your personal theatre history.",
  },
  {
    title: "Rank Your Favorites",
    description:
      "Drag and drop your shows into a ranked list. See how your taste compares with friends.",
  },
  {
    title: "Plan Theatre Trips",
    description:
      "Organize upcoming trips with friends — pick shows, schedule days, and vote on what to see.",
  },
  {
    title: "Discover What's On",
    description:
      "Browse currently running, upcoming, and closing-soon productions across Broadway, Off-Broadway, West End, and more.",
  },
];

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

      {/* Features */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-16 bg-linear-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Everything a theatregoer needs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-12">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <div
                  className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, ${BRAND_PURPLE} 100%)`,
                  }}
                >
                  {feature.title[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
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
            then tap the button below on your iPhone to accept the beta and
            install Theatre Diary.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            This is a public invite link—no email signup on this site required.
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
