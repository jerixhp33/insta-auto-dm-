/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, Zap, BarChart2, Plus, ArrowRight, Activity, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SyncNowButton } from "@/components/automation/sync-now-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's workspace
  const { data: memberRecord } = await (supabase
    .from("workspace_members") as any)
    .select("workspace_id, workspaces(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const workspaceId = (memberRecord as any)?.workspace_id;

  // Fetch stats
  const [
    { count: totalComments },
    { count: activeAutomations },
    { count: totalRepliesSent },
    { count: totalDmsSent },
    { data: recentEvents },
    { data: connectedAccounts },
  ] = await Promise.all([
    (supabase.from("automation_events") as any).select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId || ""),
    (supabase.from("automations") as any).select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId || "").eq("status", "active"),
    (supabase.from("automation_events") as any).select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId || "").eq("public_reply_status", "success"),
    (supabase.from("automation_events") as any).select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId || "").eq("dm_status", "success"),
    (supabase.from("automation_events") as any)
      .select("id, status, comment_text, commenter_username, created_at, automation_id")
      .eq("workspace_id", workspaceId || "")
      .order("created_at", { ascending: false })
      .limit(8),
    (supabase.from("instagram_accounts") as any)
      .select("id, username, status, profile_picture_url")
      .eq("workspace_id", workspaceId || "")
      .eq("status", "connected"),
  ]);

  const repliesSent = totalRepliesSent || (recentEvents?.filter((e: any) => e.status === "success").length || 0);
  const dmsSent = totalDmsSent || 0;

  const activityItems = (recentEvents || []).map((e: any) => ({
    id: e.id,
    type: "comment" as const,
    title: `Comment from @${e.commenter_username || "user"}`,
    description: e.comment_text,
    status: e.status === "success" ? "success" as const : e.status === "failed" ? "failed" as const : "pending" as const,
    created_at: e.created_at,
  }));

  const workspace = memberRecord?.workspaces as { id: string; name: string } | undefined;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">
              {greeting} ☀️
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Engine Online • 15s Polling
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Here&apos;s your live Instagram engagement & automated DM conversions.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <SyncNowButton />
          {connectedAccounts?.length ? (
            <Button asChild>
              <Link href="/dashboard/automations/new">
                <Plus className="h-4 w-4" />
                New Automation
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/dashboard/instagram">
                <Plus className="h-4 w-4" />
                Connect Instagram
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Comments"
          value={totalComments || 0}
          growth={12}
          icon={<MessageCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Replies Sent"
          value={repliesSent}
          growth={10}
          icon={<Mail className="h-5 w-5" />}
        />
        <StatCard
          title="DMs Sent"
          value={dmsSent}
          growth={16}
          icon={<Mail className="h-5 w-5" />}
        />
        <StatCard
          title="Active Automations"
          value={activeAutomations || 0}
          icon={<Zap className="h-5 w-5" />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Connected accounts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Connected Instagram</CardTitle>
              <Link href="/dashboard/instagram" className="text-xs text-violet-600 hover:underline font-medium">
                Manage
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {connectedAccounts?.length ? (
              <div className="space-y-3">
                {connectedAccounts.map((account: any) => (
                  <div key={account.id} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {account.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">@{account.username}</p>
                      <p className="text-xs text-slate-500">Business Account</p>
                    </div>
                    <Badge variant="success">Connected</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center mb-3">
                  <BarChart2 className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm text-slate-500 mb-3">No Instagram account connected</p>
                <Button size="sm" asChild>
                  <Link href="/dashboard/instagram">Connect Instagram</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Link href="/dashboard/activity" className="text-xs text-violet-600 hover:underline font-medium flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={activityItems} />
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      {!activeAutomations && (
        <Card className="border-dashed border-2 border-slate-200 bg-white/50">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 mb-4">
              <Zap className="h-6 w-6 text-violet-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Create your first automation</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              Set up keyword triggers that automatically reply to comments and send DMs.
            </p>
            <Button asChild>
              <Link href="/dashboard/automations/new">
                <Plus className="h-4 w-4" />
                Create Automation
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
