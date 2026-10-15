import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Plus, MoreVertical, TrendingUp, MessageCircle, Mail } from "lucide-react";
import Link from "next/link";

interface MemberRow { workspace_id: string; }
interface AutomationRow {
  id: string; name: string; status: string; public_reply: string | null; private_message: string | null;
  trigger_count: number; success_count: number; failure_count: number; dm_enabled: boolean;
  created_at: string;
  instagram_accounts: { username: string } | null;
  automation_keywords: { keyword: string }[];
  products: { name: string; price: number | null } | null;
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
    .select("id, name, status, public_reply, private_message, trigger_count, success_count, failure_count, dm_enabled, created_at, instagram_accounts(username), automation_keywords(keyword), products(name, price)")
    .eq("workspace_id", workspaceId || "").order("created_at", { ascending: false });
  const automations = (rawAutomations || []) as unknown as AutomationRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Automations</h1>
          <p className="text-sm text-slate-500 mt-0.5">{automations.length} automation{automations.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild><Link href="/dashboard/automations/new"><Plus className="h-4 w-4" />New Automation</Link></Button>
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
                          {account && <p className="text-xs text-slate-500 mt-0.5">@{account.username}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={config.variant}>{config.label}</Badge>
                          <Button variant="ghost" size="icon-sm"><MoreVertical className="h-4 w-4" /></Button>
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
                    <Button variant="outline" size="sm" asChild className="flex-1"><Link href={`/dashboard/automations/${automation.id}`}>Edit</Link></Button>
                    <Button variant={automation.status === "active" ? "secondary" : "default"} size="sm" className="flex-1">
                      {automation.status === "active" ? "Pause" : "Activate"}
                    </Button>
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
