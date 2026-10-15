/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MessageCircle, CheckCircle, XCircle, Zap, Camera, Users, Building2 } from "lucide-react";

interface AutoItem {
  id: string;
  name: string;
  trigger_count: number;
  success_count: number;
  failure_count: number;
}

export default async function AdminAnalyticsPage() {
  const supabase = await createServiceClient();

  const [
    { count: totalEvents },
    { count: successEvents },
    { count: failedEvents },
    { count: totalAutomations },
    { count: totalUsers },
    { count: totalWorkspaces },
    { data: recentEvents },
    { data: topAutomations }
  ] = await Promise.all([
    supabase.from("automation_events").select("*", { count: "exact", head: true }),
    supabase.from("automation_events").select("*", { count: "exact", head: true }).eq("status", "success"),
    supabase.from("automation_events").select("*", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("automations").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("workspaces").select("*", { count: "exact", head: true }),
    supabase.from("automation_events").select("keyword_matched, status, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("automations").select("id, name, trigger_count, success_count, failure_count").order("trigger_count", { ascending: false }).limit(5),
  ]);

  const successRate = totalEvents ? Math.round(((successEvents || 0) / totalEvents) * 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform-wide engagement, automation volume, and deliverability metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Total Automation Events</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900">{totalEvents || 0}</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Zap className="h-4 w-4" /></div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Platform Success Rate</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-600">{successRate}%</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle className="h-4 w-4" /></div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Total Active Rules</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900">{totalAutomations || 0}</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><MessageCircle className="h-4 w-4" /></div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Active Workspaces</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900">{totalWorkspaces || 0}</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Building2 className="h-4 w-4" /></div>
          </div>
        </Card>
      </div>

      {/* Top Automations by Trigger Count */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Performing Automations</CardTitle>
          <CardDescription>Most triggered rules across all workspaces</CardDescription>
        </CardHeader>
        <CardContent>
          {topAutomations && (topAutomations as unknown as AutoItem[]).length > 0 ? (
            <div className="divide-y divide-slate-100">
              {(topAutomations as unknown as AutoItem[]).map(auto => (
                <div key={auto.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{auto.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{auto.trigger_count || 0} total triggers</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-600 font-medium">{auto.success_count || 0} replied</span>
                    <span className="text-xs text-red-500 font-medium">{auto.failure_count || 0} failed</span>
                    <Badge variant={auto.trigger_count > 0 ? "success" : "secondary"}>
                      {auto.trigger_count > 0 ? `${Math.round(((auto.success_count || 0) / auto.trigger_count) * 100)}% Success` : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-6 text-center">No automation activity recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
