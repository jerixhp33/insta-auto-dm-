import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MoreVertical } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UserRow { id: string; email: string; full_name: string | null; is_admin: boolean; created_at: string; }
interface MemberRow { user_id: string; workspace_id: string; }

export default async function AdminUsersPage() {
  const supabase = await createServiceClient();
  const { data: users } = await supabase.from("profiles").select("id, email, full_name, is_admin, created_at").order("created_at", { ascending: false }).limit(100);
  const { data: memberCounts } = await supabase.from("workspace_members").select("user_id, workspace_id");
  const typedUsers = (users || []) as UserRow[];
  const typedMembers = (memberCounts || []) as MemberRow[];
  const workspaceCountByUser = typedMembers.reduce<Record<string, number>>((acc, m) => {
    acc[m.user_id] = (acc[m.user_id] || 0) + 1; return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500 mt-0.5">{typedUsers.length} registered users</p>
      </div>
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["User","Email","Workspaces","Role","Joined",""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {typedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold shrink-0">
                          {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{user.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600">{workspaceCountByUser[user.id] || 0}</td>
                    <td className="px-4 py-3"><Badge variant={user.is_admin ? "destructive" : "secondary"}>{user.is_admin ? "Admin" : "User"}</Badge></td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3"><Button variant="ghost" size="icon-sm"><MoreVertical className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <div className="lg:hidden space-y-3">
        {typedUsers.map(user => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-sm font-bold shrink-0">
                  {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{user.full_name || "No name"}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <Badge variant={user.is_admin ? "destructive" : "secondary"}>{user.is_admin ? "Admin" : "User"}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
