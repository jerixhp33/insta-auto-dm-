import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, User, Building2 } from "lucide-react";

export default async function AdminLogsPage() {
  const supabase = await createServiceClient();

  const { data: logs } = await supabase
    .from("activity_logs")
    .select(`
      id, action, created_at, metadata,
      profiles:user_id(full_name, email),
      workspaces:workspace_id(name)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity & Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-0.5">Real-time log of administrative and user actions across the platform</p>
      </div>

      <div className="space-y-3">
        {logs && logs.length > 0 ? (
          logs.map((log: any) => {
            const user = log.profiles;
            const ws = log.workspaces;
            const dateStr = new Date(log.created_at).toLocaleString();

            return (
              <Card key={log.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-violet-50 text-violet-600 mt-0.5">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">
                            {log.action.replace(/_/g, " ").toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">• {dateStr}</span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                          {user && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <User className="h-3 w-3 text-slate-400" /> {user.full_name || user.email}
                            </span>
                          )}
                          {ws && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Building2 className="h-3 w-3 text-slate-400" /> {ws.name}
                            </span>
                          )}
                        </div>

                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <pre className="mt-2 p-2 rounded-lg bg-slate-50 text-[11px] font-mono text-slate-600 overflow-x-auto max-w-xl">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>

                    <Badge variant="outline" className="font-mono text-[10px]">
                      {log.id.slice(0, 8)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="p-12 text-center text-slate-400">
            No system activity logs recorded yet.
          </Card>
        )}
      </div>
    </div>
  );
}
