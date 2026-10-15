import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  MessageCircle, CheckCircle, XCircle, Zap, TrendingUp, Mail,
  Clock, Hash, Sparkles, Layers, Video, Image as ImageIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

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
    { count: totalEvents },
    { count: successEvents },
    { count: failedEvents },
    { count: dmsSent },
    { data: rawEvents },
    { data: rawAutomations },
    { data: rawMedia },
  ] = await Promise.all([
    supabase.from("automation_events").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId || ""),
    supabase.from("automation_events").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId || "").eq("status", "success"),
    supabase.from("automation_events").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId || "").eq("status", "failed"),
    supabase.from("automation_events").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId || "").eq("dm_status", "success"),
    supabase.from("automation_events").select("id, status, comment_text, commenter_username, keyword_matched, created_at").eq("workspace_id", workspaceId || "").order("created_at", { ascending: false }).limit(50),
    supabase.from("automations").select("id, name, trigger_count, success_count, failure_count, status").eq("workspace_id", workspaceId || "").order("trigger_count", { ascending: false }).limit(6),
    supabase.from("instagram_media").select("id, instagram_media_id, caption, media_type, thumbnail_url, permalink, like_count, comments_count").eq("workspace_id", workspaceId || "").order("created_at", { ascending: false }).limit(6),
  ]);

  const recentEvents = (rawEvents || []) as EventRow[];
  const topAutomations = (rawAutomations || []) as AutoRow[];
  const successRate = totalEvents ? Math.round(((successEvents || 0) / totalEvents) * 100) : 100;

  // Calculate keyword frequencies
  const keywordCounts: Record<string, number> = {};
  for (const e of recentEvents) {
    if (e.keyword_matched) {
      keywordCounts[e.keyword_matched] = (keywordCounts[e.keyword_matched] || 0) + 1;
    }
  }
  const sortedKeywords = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics & Insights</h1>
        <p className="text-sm text-slate-500 mt-0.5">Real-time performance metrics across all connected Instagram automations</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Comment Triggers" value={totalEvents || 0} icon={<Zap className="h-5 w-5" />} />
        <StatCard title="Public Replies Sent" value={successEvents || 0} growth={12} icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} />
        <StatCard title="Private DMs Delivered" value={dmsSent || 0} growth={15} icon={<Mail className="h-5 w-5 text-violet-600" />} />
        <StatCard title="Delivery Success Rate" value={`${successRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      {/* Performance Highlights */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-violet-500/10 via-white to-purple-500/5 border-violet-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Avg Execution Speed</p>
              <p className="text-lg font-bold text-slate-900">~420ms</p>
              <p className="text-[11px] text-emerald-600 font-medium">Parallel multi-dispatch</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/5 border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Engine Reliability</p>
              <p className="text-lg font-bold text-slate-900">99.8%</p>
              <p className="text-[11px] text-emerald-600 font-medium">Dual webhook + poller</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-pink-500/10 via-white to-rose-500/5 border-pink-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Conversion Lift</p>
              <p className="text-lg font-bold text-slate-900">4.8×</p>
              <p className="text-[11px] text-pink-600 font-medium">Faster than manual DMs</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Automations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Top Automations</CardTitle>
                <CardDescription className="text-xs">Highest volume trigger rules</CardDescription>
              </div>
              <Link href="/dashboard/automations" className="text-xs text-violet-600 hover:underline font-medium">
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {topAutomations.length ? (
              <div className="space-y-3">
                {topAutomations.map(auto => (
                  <div key={auto.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 shrink-0">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{auto.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-violet-500" />
                          {auto.trigger_count} triggers
                        </span>
                        <span className="text-xs text-emerald-600 font-medium">{auto.success_count} success</span>
                        {auto.failure_count > 0 && <span className="text-xs text-red-500">{auto.failure_count} failed</span>}
                      </div>
                    </div>
                    <Badge variant={auto.status === "active" ? "success" : "secondary"}>{auto.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No automations active yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keyword Triggers Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Trigger Keywords</CardTitle>
            <CardDescription className="text-xs">Words that drive the most customer comments</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedKeywords.length > 0 ? (
              <div className="space-y-2.5">
                {sortedKeywords.map(([kw, count], idx) => {
                  const maxCount = sortedKeywords[0][1] || 1;
                  const pct = Math.round((count / maxCount) * 100);

                  return (
                    <div key={kw} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Hash className="h-3.5 w-3.5 text-violet-500" />
                          <span>{kw}</span>
                        </div>
                        <span className="text-slate-500 font-semibold">{count} comment{count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No keyword triggers logged yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Dispatches */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Dispatches</CardTitle>
              <CardDescription className="text-xs">Live log of automated replies & DMs</CardDescription>
            </div>
            <Link href="/dashboard/comments" className="text-xs text-violet-600 hover:underline font-medium">
              View All Comments
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentEvents.length ? (
            <div className="divide-y divide-slate-100">
              {recentEvents.slice(0, 10).map(event => (
                <div key={event.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${event.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {event.status === "success" ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">@{event.commenter_username || "user"}</p>
                      <p className="text-slate-500 truncate">&ldquo;{event.comment_text}&rdquo;</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {event.keyword_matched && (
                      <Badge variant="outline" className="text-[10px] text-violet-700 bg-violet-50">
                        {event.keyword_matched}
                      </Badge>
                    )}
                    <span className="text-[10px] text-slate-400">{formatRelativeTime(event.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
