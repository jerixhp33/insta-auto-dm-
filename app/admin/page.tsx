import { createServiceClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Camera, Zap, MessageCircle, CheckCircle, XCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface UserRow { id: string; email: string; full_name: string | null; is_admin: boolean; created_at: string; }
interface LogRow { id: string; action: string; user_id: string | null; workspace_id: string | null; created_at: string; metadata: Record<string,unknown>; }

export default async function AdminDashboardPage() {
  const supabase = await createServiceClient();
  const [
    { count: totalUsers }, { count: totalWorkspaces }, { count: connectedAccounts },
    { count: activeAutomations }, { count: totalEvents }, { count: successEvents }, { count: failedEvents },
    { data: rawActivity }, { data: rawUsers },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("workspaces").select("*", { count: "exact", head: true }),
    supabase.from("instagram_accounts").select("*", { count: "exact", head: true }).eq("status", "connected"),
    supabase.from("automations").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("automation_events").select("*", { count: "exact", head: true }),
    supabase.from("automation_events").select("*", { count: "exact", head: true }).eq("status", "success"),
    supabase.from("automation_events").select("*", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("activity_logs").select("id, action, user_id, workspace_id, created_at, metadata").order("created_at", { ascending: false }).limit(10),
    supabase.from("profiles").select("id, email, full_name, is_admin, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const recentActivity = (rawActivity || []) as LogRow[];
  const recentUsers = (rawUsers || []) as UserRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">System overview</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={totalUsers || 0} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Workspaces" value={totalWorkspaces || 0} icon={<Building2 className="h-5 w-5" />} />
        <StatCard title="Connected IG" value={connectedAccounts || 0} icon={<Camera className="h-5 w-5" />} />
        <StatCard title="Active Automations" value={activeAutomations || 0} icon={<Zap className="h-5 w-5" />} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Events" value={totalEvents || 0} icon={<MessageCircle className="h-5 w-5" />} />
        <StatCard title="Success" value={successEvents || 0} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard title="Failed" value={failedEvents || 0} icon={<XCircle className="h-5 w-5" />} />
        <StatCard title="Success Rate" value={totalEvents ? `${Math.round(((successEvents||0)/totalEvents)*100)}%` : "—"} icon={<CheckCircle className="h-5 w-5" />} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Recent Signups</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold shrink-0">
                    {u.full_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {u.is_admin && <Badge variant="destructive" className="text-[10px]">Admin</Badge>}
                    <span className="text-xs text-slate-400">{formatRelativeTime(u.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivity.map(log => (
                <div key={log.id} className="flex items-start gap-3 rounded-xl p-2 hover:bg-slate-50">
                  <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Zap className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-400">{formatRelativeTime(log.created_at)}</p>
                  </div>
                </div>
              ))}
              {!recentActivity.length && <p className="text-sm text-slate-400 text-center py-6">No activity yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
