import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { MessageCircle, CheckCircle, XCircle, Zap, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

interface MemberRow { workspace_id: string; }
interface AutoRow { id: string; name: string; trigger_count: number; success_count: number; failure_count: number; status: string; }
interface EventRow { id: string; status: string; comment_text: string; commenter_username: string | null; keyword_matched: string | null; created_at: string; }

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: rawMember } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).single();
  const workspaceId = (rawMember as MemberRow | null)?.workspace_id;

  const [
    { count: totalEvents }, { count: successEvents }, { count: failedEvents }, { count: activeAutomations },
    { data: rawEvents }, { data: rawAutomations },
  ] = await Promise.all([
    supabase.from("automation_events").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId || ""),
    supabase.from("automation_events").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId || "").eq("status", "success"),
    supabase.from("automation_events").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId || "").eq("status", "failed"),
    supabase.from("automations").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId || "").eq("status", "active"),
    supabase.from("automation_events").select("id, status, comment_text, commenter_username, keyword_matched, created_at").eq("workspace_id", workspaceId || "").order("created_at", { ascending: false }).limit(20),
    supabase.from("automations").select("id, name, trigger_count, success_count, failure_count, status").eq("workspace_id", workspaceId || "").order("trigger_count", { ascending: false }).limit(5),
  ]);

  const recentEvents = (rawEvents || []) as EventRow[];
  const topAutomations = (rawAutomations || []) as AutoRow[];
  const successRate = totalEvents ? Math.round(((successEvents || 0) / totalEvents) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track your automation performance</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Events" value={totalEvents || 0} icon={<Zap className="h-5 w-5" />} />
        <StatCard title="Successful" value={successEvents || 0} growth={10} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard title="Failed" value={failedEvents || 0} icon={<XCircle className="h-5 w-5" />} />
        <StatCard title="Success Rate" value={`${successRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top Automations</CardTitle></CardHeader>
          <CardContent>
            {topAutomations.length ? (
              <div className="space-y-3">
                {topAutomations.map(auto => (
                  <div key={auto.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 shrink-0">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{auto.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500 flex items-center gap-1"><TrendingUp className="h-3 w-3" />{auto.trigger_count} triggers</span>
                        <span className="text-xs text-emerald-600">{auto.success_count} success</span>
                        {auto.failure_count > 0 && <span className="text-xs text-red-500">{auto.failure_count} failed</span>}
                      </div>
                    </div>
                    <Badge variant={auto.status === "active" ? "success" : "secondary"}>{auto.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center"><Zap className="h-8 w-8 text-slate-200 mx-auto mb-2" /><p className="text-sm text-slate-400">No data yet</p></div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Events</CardTitle></CardHeader>
          <CardContent>
            {recentEvents.length ? (
              <div className="space-y-2">
                {recentEvents.map(event => (
                  <div key={event.id} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 transition-colors">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${event.status === "success" ? "bg-emerald-100 text-emerald-600" : event.status === "failed" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                      {event.status === "success" ? <CheckCircle className="h-3.5 w-3.5" /> : event.status === "failed" ? <XCircle className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-medium text-slate-900 truncate">@{event.commenter_username || "user"}</p>
                        {event.keyword_matched && <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">{event.keyword_matched}</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{event.comment_text}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{formatRelativeTime(event.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center"><MessageCircle className="h-8 w-8 text-slate-200 mx-auto mb-2" /><p className="text-sm text-slate-400">No events yet</p></div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
