import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Camera, Zap, Calendar } from "lucide-react";

export default async function AdminWorkspacesPage() {
  const supabase = await createServiceClient();

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select(`
      id, name, slug, created_at,
      profiles:owner_id(full_name, email),
      workspace_members(count),
      instagram_accounts(count),
      automations(count)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Workspaces</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage all registered customer workspaces and teams</p>
      </div>

      <div className="grid gap-4">
        {workspaces && workspaces.length > 0 ? (
          workspaces.map((ws: any) => {
            const owner = ws.profiles;
            const membersCount = ws.workspace_members?.[0]?.count || 1;
            const igAccountsCount = ws.instagram_accounts?.[0]?.count || 0;
            const automationsCount = ws.automations?.[0]?.count || 0;
            const dateStr = new Date(ws.created_at).toLocaleDateString();

            return (
              <Card key={ws.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-base shrink-0">
                        {ws.name?.[0]?.toUpperCase() || "W"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900">{ws.name}</h3>
                          <Badge variant="outline" className="font-mono text-xs text-slate-500">
                            /{ws.slug || ws.name.toLowerCase().replace(/\s+/g, "-")}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Owner: <span className="font-medium text-slate-700">{owner?.full_name || owner?.email || "Unknown"}</span> ({owner?.email})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                        <Users className="h-3.5 w-3.5 text-slate-400" /> {membersCount} Members
                      </span>
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                        <Camera className="h-3.5 w-3.5 text-pink-500" /> {igAccountsCount} IG Accounts
                      </span>
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                        <Zap className="h-3.5 w-3.5 text-violet-500" /> {automationsCount} Automations
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="h-3.5 w-3.5" /> {dateStr}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="p-12 text-center text-slate-400">
            No workspaces registered yet.
          </Card>
        )}
      </div>
    </div>
  );
}
