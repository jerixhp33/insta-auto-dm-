import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Plus, MoreVertical, TrendingUp, MessageCircle, Mail, Layers, Video, Image as ImageIcon, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SyncNowButton } from "@/components/automation/sync-now-button";
import { AutomationCardActions, AutomationToggleButton } from "@/components/automation/automation-card-actions";
import { AutomationSimulatorModal } from "@/components/automation/automation-simulator-modal";

interface MemberRow { workspace_id: string; }
interface AutomationRow {
  id: string; name: string; status: string; public_reply: string | null; private_message: string | null;
  trigger_count: number; success_count: number; failure_count: number; dm_enabled: boolean;
  created_at: string;
  instagram_accounts: { username: string } | null;
  automation_keywords: { keyword: string }[];
  products: { name: string; price: number | null } | null;
  instagram_media: { id: string; media_type: string; caption: string | null; thumbnail_url: string | null; permalink: string | null } | null;
}

const statusConfig: Record<string, { variant: "success" | "secondary" | "outline"; label: string }> = {
  active: { variant: "success", label: "Active" },
  inactive: { variant: "secondary", label: "Inactive" },
  draft: { variant: "outline", label: "Draft" },
};

export default async function AutomationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: rawMember } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).single();
  const workspaceId = (rawMember as MemberRow | null)?.workspace_id;
  const { data: rawAutomations } = await supabase.from("automations")
    .select("id, name, status, public_reply, private_message, trigger_count, success_count, failure_count, dm_enabled, created_at, instagram_accounts(username), automation_keywords(keyword), products(name, price), instagram_media(id, media_type, caption, thumbnail_url, permalink)")
    .eq("workspace_id", workspaceId || "").order("created_at", { ascending: false });
  const automations = (rawAutomations || []) as unknown as AutomationRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Automations</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Independent Engine Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {automations.length} automation{automations.length !== 1 ? "s" : ""} • Scanning comments automatically every 15s
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <AutomationSimulatorModal automationsList={automations.map(a => ({ id: a.id, name: a.name }))} />
          <SyncNowButton />
          <Button asChild><Link href="/dashboard/automations/new"><Plus className="h-4 w-4" />New Automation</Link></Button>
        </div>
      </div>
      {automations.length ? (
        <div className="grid gap-4">
          {automations.map(automation => {
            const keywords = automation.automation_keywords || [];
            const product = automation.products;
            const account = automation.instagram_accounts;
            const config = statusConfig[automation.status] || statusConfig.inactive;
            return (
              <Card key={automation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 shrink-0"><Zap className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">{automation.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {account && <span className="text-xs text-slate-500">@{account.username}</span>}
                            {automation.instagram_media ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-pink-50 border border-pink-200/60 px-2 py-0.5 text-[11px] font-medium text-pink-700">
                                {automation.instagram_media.media_type === "VIDEO" ? (
                                  <Video className="h-3 w-3 text-pink-600" />
                                ) : (
                                  <ImageIcon className="h-3 w-3 text-pink-600" />
                                )}
                                {automation.instagram_media.media_type === "VIDEO" ? "Reel" : "Post"}
                                {automation.instagram_media.caption && (
                                  <span className="max-w-[140px] truncate text-slate-600">
                                    : {automation.instagram_media.caption}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                <Layers className="h-3 w-3 text-slate-500" />
                                All Posts & Reels
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={config.variant}>{config.label}</Badge>
                          <AutomationCardActions automation={automation as any} />
                        </div>
                      </div>
                      {keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {keywords.slice(0, 4).map(({ keyword }) => (
                            <span key={keyword} className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{keyword}</span>
                          ))}
                          {keywords.length > 4 && <span className="text-xs text-slate-400">+{keywords.length - 4} more</span>}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-violet-400" />{automation.trigger_count} triggers</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5 text-blue-400" />{automation.success_count} replies</span>
                        {automation.dm_enabled && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-emerald-400" />DMs enabled</span>}
                        {product && <span className="text-violet-600 font-medium">{product.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link href={`/dashboard/automations/${automation.id}`}>Edit</Link>
                    </Button>
                    <AutomationToggleButton
                      automationId={automation.id}
                      currentStatus={automation.status}
                      automationName={automation.name}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 mb-4"><Zap className="h-7 w-7 text-violet-600" /></div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No automations yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">Create your first automation to start automatically replying to comments.</p>
            <Button asChild><Link href="/dashboard/automations/new"><Plus className="h-4 w-4" />Create Automation</Link></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
