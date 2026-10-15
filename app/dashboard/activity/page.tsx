import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, MessageCircle, CheckCircle, XCircle, Zap, Mail } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface EventRow {
  id: string; status: string; comment_text: string; commenter_username: string | null;
  keyword_matched: string | null; public_reply_status: string | null; dm_status: string | null;
  retry_count: number; error_message: string | null; created_at: string; updated_at: string;
  automations: { name: string } | null;
}
interface MemberRow { workspace_id: string; }

const statusBadge: Record<string, { variant: "success" | "destructive" | "secondary" | "default" | "warning" | "outline"; label: string }> = {
  success: { variant: "success", label: "Success" },
  failed: { variant: "destructive", label: "Failed" },
  pending: { variant: "secondary", label: "Pending" },
  processing: { variant: "default", label: "Processing" },
  retrying: { variant: "secondary", label: "Retrying" },
};

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawMember } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).single();
  const memberRecord = rawMember as MemberRow | null;
  const workspaceId = memberRecord?.workspace_id;

  const { data: rawEvents } = await supabase
    .from("automation_events")
    .select("id, status, comment_text, commenter_username, keyword_matched, public_reply_status, dm_status, retry_count, error_message, created_at, updated_at, automations(name)")
    .eq("workspace_id", workspaceId || "")
    .order("created_at", { ascending: false })
    .limit(50);
  const events = (rawEvents || []) as unknown as EventRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
        <p className="text-sm text-slate-500 mt-0.5">Full history of automation events</p>
      </div>
      {events.length ? (
        <div className="space-y-3">
          {events.map(event => {
            const automation = event.automations;
            const status = statusBadge[event.status] || statusBadge.pending;
            return (
              <Card key={event.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${event.status === "success" ? "bg-emerald-50 text-emerald-600" : event.status === "failed" ? "bg-red-50 text-red-600" : "bg-violet-50 text-violet-600"}`}>
                      {event.status === "success" ? <CheckCircle className="h-4 w-4" /> : event.status === "failed" ? <XCircle className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">@{event.commenter_username || "unknown"}</span>
                        {event.keyword_matched && <Badge variant="default" className="text-[10px] py-0">keyword: {event.keyword_matched}</Badge>}
                        <Badge variant={status.variant} className="text-[10px] py-0">{status.label}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">&ldquo;{event.comment_text}&rdquo;</p>
                      <div className="flex flex-wrap gap-3 mb-2">
                        {event.public_reply_status && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <MessageCircle className="h-3.5 w-3.5" />
                            Reply: <span className={event.public_reply_status === "success" ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{event.public_reply_status}</span>
                          </div>
                        )}
                        {event.dm_status && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="h-3.5 w-3.5" />
                            DM: <span className={event.dm_status === "success" ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{event.dm_status}</span>
                          </div>
                        )}
                        {event.retry_count > 0 && <div className="flex items-center gap-1.5 text-xs text-amber-600"><Zap className="h-3.5 w-3.5" />Retried {event.retry_count}×</div>}
                      </div>
                      {event.error_message && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-2 py-1 mb-2">{event.error_message}</p>}
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {automation && <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{automation.name}</span>}
                        <span>{formatDate(event.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Activity className="h-10 w-10 text-slate-200 mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">No activity yet</h3>
            <p className="text-sm text-slate-400">Activity will appear here once your automations fire.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
