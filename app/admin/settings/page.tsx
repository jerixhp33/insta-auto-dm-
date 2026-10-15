import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, CheckCircle2, ShieldCheck, Database, Key, Server, Webhook } from "lucide-react";

export default function AdminSettingsPage() {
  const envStatus = [
    { name: "NEXT_PUBLIC_SUPABASE_URL", status: !!process.env.NEXT_PUBLIC_SUPABASE_URL, desc: "Supabase project connection URL" },
    { name: "SUPABASE_SERVICE_ROLE_KEY", status: !!process.env.SUPABASE_SERVICE_ROLE_KEY, desc: "Bypasses RLS for secure background tasks" },
    { name: "META_APP_ID", status: !!process.env.META_APP_ID, desc: "Meta Developer Application ID" },
    { name: "META_APP_SECRET", status: !!process.env.META_APP_SECRET, desc: "HMAC signature verification secret" },
    { name: "META_WEBHOOK_VERIFY_TOKEN", status: !!process.env.META_WEBHOOK_VERIFY_TOKEN, desc: "Webhook handshake challenge token" },
    { name: "ENCRYPTION_KEY", status: !!process.env.ENCRYPTION_KEY, desc: "AES-256 token encryption secret" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Configuration</h1>
        <p className="text-sm text-slate-500 mt-0.5">Global SaaS infrastructure, Meta Graph API, and security status</p>
      </div>

      {/* Meta API & Webhook Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-base">Instagram & Meta Integration Status</CardTitle>
          </div>
          <CardDescription>Official endpoints and tokens registered with Meta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-xs text-slate-400 font-medium">Facebook / Meta App ID</span>
              <p className="font-mono text-sm font-semibold text-slate-900">{process.env.META_APP_ID || "1506683824603194"}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-xs text-slate-400 font-medium">Instagram App ID</span>
              <p className="font-mono text-sm font-semibold text-slate-900">{process.env.INSTAGRAM_APP_ID || "1647540866708249"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-xs text-slate-400 font-medium">Live Webhook Endpoint</span>
              <p className="font-mono text-xs text-slate-800 break-all">https://insta-auto-dm-six.vercel.app/api/webhooks/instagram</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-xs text-slate-400 font-medium">Verify Token</span>
              <p className="font-mono text-xs text-slate-800">autome_webhook_verify_token_98741</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Subscribed Webhook Fields:</span>
            <Badge variant="success" className="text-xs">comments</Badge>
            <Badge variant="success" className="text-xs">messages</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Environment & Security Check */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-base">Environment Health & Security</CardTitle>
          </div>
          <CardDescription>Verification of all required encryption and service keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {envStatus.map(env => (
              <div key={env.name} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-900">{env.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{env.desc}</p>
                </div>
                <Badge variant={env.status ? "success" : "destructive"} className="gap-1">
                  {env.status ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" /> Configured
                    </>
                  ) : (
                    "Missing"
                  )}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
