import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Stageworth",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold mb-6">About Stageworth</h1>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <p>
          Stageworth is a mobile app for theatregoers who want to keep track
          of every show they see, rank their favorites, and plan upcoming
          theatre trips with friends.
        </p>

        <p>
          Whether you&apos;re a Broadway regular, a West End enthusiast, or
          someone who catches regional and touring productions, Stageworth
          gives you a single place to record your theatre life and discover
          what&apos;s playing.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-3">Features</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Show tracking:</strong> Log every show you see with date,
            venue, seat, cast, and personal notes.
          </li>
          <li>
            <strong>Rankings:</strong> Drag-and-drop your shows into a personal
            ranked list.
          </li>
          <li>
            <strong>Trip planning:</strong> Organize theatre trips with friends
            — add shows, schedule days, and vote on what to see.
          </li>
          <li>
            <strong>Browse:</strong> Discover currently running, upcoming, and
            closing-soon productions.
          </li>
          <li>
            <strong>Social:</strong> Follow friends, see their activity, and
            compare rankings.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-3">Contact</h2>
        <p>
          Questions, feedback, or partnership inquiries? Reach out at{" "}
          <a
            href="mailto:hello@stageworth.app"
            className="text-gray-900 underline"
          >
            hello@stageworth.app
          </a>
          .
        </p>
      </div>
    </div>
  );
}
