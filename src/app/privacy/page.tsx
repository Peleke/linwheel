import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | LinWheel",
  description: "Privacy Policy for LinWheel",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6">
          <p className="text-zinc-600 dark:text-zinc-400">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8 mb-4">
              1. Information We Collect
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              LinWheel collects the following information when you use our service:
            </p>
            <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
              <li>Account information (email address) through our authentication provider</li>
              <li>Content you create using our service (posts, articles, images)</li>
              <li>LinkedIn profile information (name, profile ID) when you connect your LinkedIn account</li>
              <li>OAuth tokens to publish content on your behalf</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8 mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              We use your information to:
            </p>
            <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
              <li>Provide and improve our content generation service</li>
              <li>Publish content to LinkedIn on your behalf when you explicitly request it</li>
              <li>Send you notifications about scheduled content (if enabled)</li>
              <li>Maintain and secure your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8 mb-4">
              3. LinkedIn Integration
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              When you connect your LinkedIn account, we request permission to:
            </p>
            <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
              <li>Access your basic profile information (name)</li>
              <li>Post content to LinkedIn on your behalf</li>
            </ul>
            <p className="text-zinc-600 dark:text-zinc-400 mt-4">
              We only post to LinkedIn when you explicitly click the &quot;Publish to LinkedIn&quot; button.
              We never post automatically or without your action. You can disconnect your LinkedIn
              account at any time from the Settings page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8 mb-4">
              4. Data Storage & Security
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Your data is stored securely using industry-standard encryption. OAuth tokens
              are encrypted at rest using AES-256-GCM encryption. We do not sell or share
              your personal information with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8 mb-4">
              5. Data Retention
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              We retain your content and account data for as long as your account is active.
              You can delete your content at any time. If you disconnect your LinkedIn account,
              we immediately delete your LinkedIn OAuth tokens.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8 mb-4">
              6. Your Rights
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
              <li>Access your personal data</li>
              <li>Delete your account and associated data</li>
              <li>Disconnect third-party integrations at any time</li>
              <li>Export your content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8 mb-4">
              7. Contact
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              For privacy-related questions, contact us at privacy@linwheel.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8 mb-4">
              8. Changes to This Policy
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              We may update this privacy policy from time to time. We will notify you of
              any material changes by posting the new policy on this page.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <a
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            &larr; Back to LinWheel
          </a>
        </div>
      </div>
    </div>
  );
}
