import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — Stageworth",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold mb-6">Support</h1>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <p>
          Need a hand with Stageworth? The fastest way to reach us is by email.
        </p>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">Contact</h2>
          <p>
            Email{" "}
            <a
              href="mailto:hello@stageworth.app"
              className="text-gray-900 underline"
            >
              hello@stageworth.app
            </a>{" "}
            with questions, bug reports, or feedback. Please include your
            device, OS version, and (if relevant) the username you signed in
            with so we can help faster.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">Account deletion</h2>
          <p>
            You can delete your account and all of its data directly in the
            app: open <strong>Profile</strong> → <strong>Edit profile</strong>{" "}
            → <strong>Delete account</strong>. Deletion is immediate and
            removes your profile, visits, lists, posts, and uploaded images.
          </p>
          <p>
            If you cannot access the app, email{" "}
            <a
              href="mailto:hello@stageworth.app"
              className="text-gray-900 underline"
            >
              hello@stageworth.app
            </a>{" "}
            from the address tied to your account and we will delete it for
            you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">
            Reporting and blocking other users
          </h2>
          <p>
            Tap the overflow menu (•••) on any profile, feed post, or visit to
            <strong> block</strong> or <strong>report</strong> a user. Blocks
            are symmetric — the other person cannot see you or interact with
            you. Reports are reviewed by our team, with a target of within 24
            hours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">More info</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <Link href="/privacy" className="text-gray-900 underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-gray-900 underline">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-gray-900 underline">
                About Stageworth
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
