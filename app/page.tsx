import Link from "next/link";
import { CheckCircle, ArrowRight, Sparkles, MessageCircle, Mail, Zap, BarChart2, Shield, Users } from "lucide-react";

const features = [
  { icon: MessageCircle, title: "Auto-reply to comments", description: "Respond to every keyword comment on your Reels and posts instantly." },
  { icon: Mail, title: "Send DMs automatically", description: "Deliver product details and links directly to interested customers' inboxes." },
  { icon: Zap, title: "Keyword triggers", description: "Set any word or phrase as a trigger — price, link, buy, interested, and more." },
  { icon: BarChart2, title: "Analytics & insights", description: "Track comments handled, replies sent, and DMs delivered in real time." },
  { icon: Shield, title: "Official Meta API", description: "Built on Meta's official Instagram API. No passwords. No bots. 100% safe." },
  { icon: Users, title: "Team workspaces", description: "Invite your team, assign roles, and manage multiple Instagram accounts." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">InstaAuto</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">Log in</Link>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-6">
          Automate your Instagram<br />
          <span className="text-violet-600">engagement &amp; sales</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Auto reply to comments, send product links, manage DMs and grow your business — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-8 py-4 text-base font-semibold text-white hover:bg-violet-700 transition-colors">
            Get Started Free <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
          {["No Coding Required", "100% Free to Start", "Secure &amp; Reliable"].map((item) => (
            <div key={item} className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span dangerouslySetInnerHTML={{ __html: item }} />
            </div>
          ))}
        </div>
      </section>
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[{ value: "50K+", label: "Happy users" }, { value: "1M+", label: "Comments handled" }, { value: "99.9%", label: "Uptime" }].map(({ value, label }) => (
              <div key={label}><p className="text-3xl font-bold text-slate-900 mb-1">{value}</p><p className="text-sm text-slate-500">{label}</p></div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need to grow</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-4"><Icon className="h-5 w-5" /></div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        <p>© 2024 InstaAuto. Built with the official Meta/Instagram API. Not affiliated with Meta.</p>
      </footer>
    </div>
  );
}
