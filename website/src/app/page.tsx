import Link from "next/link";

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
      <section className="relative overflow-hidden bg-gray-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-24 sm:py-32 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Your theatre life,
            <br />
            <span className="text-gray-400">all in one place.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Theatre Diary helps you track every show you see, rank your
            favorites, plan trips with friends, and stay on top of what&apos;s
            playing.
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium">
              Coming soon to the App Store
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-16">
            Everything a theatregoer needs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-12">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <div className="shrink-0 h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg">
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

      {/* CTA */}
      <section className="bg-gray-50 border-t border-gray-200 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Stay in the loop</h2>
          <p className="text-gray-600 mb-8">
            Theatre Diary is currently in development. Follow along for updates.
          </p>
          <span className="inline-flex items-center rounded-full bg-gray-900 text-white px-5 py-2.5 text-sm font-medium">
            Coming soon
          </span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>&copy; {new Date().getFullYear()} Theatre Diary</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-gray-900">
              Privacy Policy
            </Link>
            <Link href="/about" className="hover:text-gray-900">
              About
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
