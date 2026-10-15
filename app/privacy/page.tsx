import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">InstaAuto</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: October 15, 2026</p>

        <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Overview</h2>
            <p>
              InstaAuto (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides an Instagram comment and direct messaging automation platform. We are committed to protecting your personal data and respecting your privacy in compliance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Information We Collect</h2>
            <p className="mb-2">We collect information to provide our automation services, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Information:</strong> Name, email address, password hash, and workspace details.</li>
              <li><strong>Instagram Account Data:</strong> Usernames, Instagram User IDs, page IDs, and encrypted OAuth access tokens required to access the official Meta Graph API.</li>
              <li><strong>Activity and Automation Data:</strong> Comment triggers, automated reply templates, keywords, and delivery logs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">3. How We Use Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, operate, and maintain our automation services.</li>
              <li>To process automated comment replies and direct messages on your authorized Instagram accounts via Meta&apos;s official APIs.</li>
              <li>To verify user identity and ensure security.</li>
              <li>To communicate important service notifications and system updates.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Meta / Instagram Data Usage</h2>
            <p>
              Our application adheres strictly to the Meta Platform Terms and Developer Policies. We only request the minimum required permissions to perform comment management and messaging automations authorized by you. We do not sell, rent, or share your Instagram data with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Data Retention &amp; Deletion</h2>
            <p>
              You can disconnect your Instagram account or delete your automations at any time through your dashboard settings. Upon account deletion, all associated tokens and stored logs are permanently deleted from our servers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or wish to request data deletion, contact us at support@instaauto.app or visit your account dashboard.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
