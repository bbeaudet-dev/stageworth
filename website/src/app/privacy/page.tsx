import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Stageworth",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-6">
        <p className="text-gray-500">Last updated: April 2, 2026</p>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Introduction</h2>
          <p>
            Stageworth (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;)
            operates the Stageworth mobile application (the
            &quot;App&quot;). This Privacy Policy explains how we collect, use,
            and protect your information when you use our App.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">
            Information We Collect
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account information:</strong> When you sign up, we collect
              your name, email address, and profile information provided through
              your Google or Apple account.
            </li>
            <li>
              <strong>Usage data:</strong> We collect information about the
              shows you track, your rankings, lists, and trip plans within the
              App.
            </li>
            <li>
              <strong>Device information:</strong> We may collect device
              identifiers and push notification tokens to deliver notifications.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">
            How We Use Your Information
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide and maintain the App&apos;s functionality</li>
            <li>To enable social features such as following other users and sharing trip plans</li>
            <li>To send push notifications about new shows and updates</li>
            <li>To improve the App based on usage patterns</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Data Sharing</h2>
          <p>
            We do not sell your personal information to third parties. We may
            share limited data with service providers who help us operate the
            App (e.g., cloud hosting, authentication providers).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">
            Third-Party Services
          </h2>
          <p>
            The App uses third-party services including Google Sign-In, Apple
            Sign-In, and Ticketmaster Discovery API for show and event data.
            Each of these services has their own privacy policies governing
            their use of your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Data Security</h2>
          <p>
            We use industry-standard security measures to protect your data,
            including encrypted connections and secure cloud infrastructure.
            However, no method of electronic storage is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Your Rights</h2>
          <p>
            You may request deletion of your account and associated data at any
            time by contacting us. You can manage notification preferences
            within the App.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-8 mb-3">Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us
            at{" "}
            <a
              href="mailto:privacy@stageworth.app"
              className="text-gray-900 underline"
            >
              privacy@stageworth.app
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
