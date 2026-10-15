import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: October 15, 2026</p>

        <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing and using InstaAuto (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Description of Service</h2>
            <p>
              InstaAuto provides software tools to automate comment replies and direct messages on Instagram accounts owned or operated by authorized users through official Meta APIs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">3. User Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You agree to comply with all applicable laws and Meta Platform Terms.</li>
              <li>You must not use the Service to send unsolicited spam, harassment, or unlawful content.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate Meta guidelines, engage in spamming, or abuse our infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Disclaimer</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind. We are not affiliated with Meta Platforms, Inc. or Instagram.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
