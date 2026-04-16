import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Stageworth",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-6">
        <p className="text-gray-500">Last updated: April 6, 2026</p>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Agreement to Terms</h2>
          <p>
            By accessing or using the Stageworth mobile application and
            related services (collectively, the &quot;Service&quot;), you agree to
            these Terms of Service (&quot;Terms&quot;). If you do not agree, do
            not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Description of the Service</h2>
          <p>
            Stageworth lets you browse shows, log and rank performances, use
            social features, plan trips, and receive notifications. We may
            change, suspend, or discontinue features with reasonable notice where
            practical.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Accounts</h2>
          <p>
            You may need to sign in with a third-party provider (e.g. Google or
            Apple). You are responsible for activity under your account and for
            keeping credentials secure. You must provide accurate information and
            be at least 13 years old (or the minimum age required where you live).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Violate laws or others&apos; rights</li>
            <li>Harass, abuse, or impersonate others</li>
            <li>
              Attempt to probe, scrape, reverse engineer, or overload the Service
            </li>
            <li>
              Upload malware or interfere with the Service or other users&apos;
              devices
            </li>
            <li>Use the Service to spam or send unsolicited messages</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Content and Data</h2>
          <p>
            You retain rights to content you submit. You grant us a limited
            licence to host, store, and display that content to operate the
            Service (including social and sharing features). Show and event
            metadata may come from third-party sources; we do not guarantee
            accuracy or availability.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Third-Party Services</h2>
          <p>
            The Service may integrate sign-in, maps, hosting, analytics, or other
            third parties. Their terms and privacy policies apply to your use of
            those services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">
            Disclaimers; Limitation of Liability
          </h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY
            KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, STAGEWORTH AND ITS
            OPERATORS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR
            GOODWILL. OUR TOTAL LIABILITY FOR CLAIMS ARISING FROM THE SERVICE
            WILL NOT EXCEED THE GREATER OF (A) AMOUNTS YOU PAID US FOR THE SERVICE
            IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) FIFTY US DOLLARS (US$50).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Indemnity</h2>
          <p>
            You will defend and hold harmless Stageworth and its operators
            from claims arising out of your use of the Service, your content, or
            your violation of these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Termination</h2>
          <p>
            We may suspend or terminate access if you breach these Terms or if we
            need to protect the Service or other users. You may stop using the
            Service at any time. Sections that by their nature should survive will
            survive termination.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Changes</h2>
          <p>
            We may update these Terms. We will post the new date at the top of
            this page. Continued use after changes means you accept the updated
            Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Governing Law</h2>
          <p>
            These Terms are governed by the laws of the United States and the
            State in which the Service operator principally operates, without
            regard to conflict-of-law rules, except where local consumer laws
            require otherwise.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Contact</h2>
          <p>
            Questions about these Terms:{" "}
            <a
              href="mailto:hello@stageworth.app"
              className="text-gray-900 underline"
            >
              hello@stageworth.app
            </a>
            . Our{" "}
            <a href="/privacy" className="text-gray-900 underline">
              Privacy Policy
            </a>{" "}
            describes how we handle personal data.
          </p>
        </section>
      </div>
    </div>
  );
}
