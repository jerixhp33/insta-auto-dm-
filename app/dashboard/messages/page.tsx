import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail, Send, CheckCircle2, AlertCircle, Clock, Zap, Package,
  ExternalLink, UserCheck
} from "lucide-react";
import Link from "next/link";

interface MemberRow { workspace_id: string; }
interface DmEventRow {
  id: string;
  commenter_username: string | null;
  comment_text: string;
  keyword_matched: string | null;
  status: string;
  dm_status: string | null;
  error_message: string | null;
  created_at: string;
  automations: { id: string; name: string; private_message: string | null } | null;
  instagram_accounts: { username: string } | null;
  instagram_media: { caption: string | null; permalink: string | null } | null;
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawMember } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const workspaceId = (rawMember as MemberRow | null)?.workspace_id;

  const { data: rawEvents } = await supabase
    .from("automation_events")
    .select(`
      id, commenter_username, comment_text, keyword_matched, status,
      dm_status, error_message, created_at,
      automations(id, name, private_message),
      instagram_accounts(username),
      instagram_media(caption, permalink)
    `)
    .eq("workspace_id", workspaceId || "")
    .not("dm_status", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const events = (rawEvents || []) as unknown as DmEventRow[];

  const totalDms = events.length;
  const successfulDms = events.filter(e => e.dm_status === "success").length;
  const failedDms = events.filter(e => e.dm_status === "failed").length;
  const successRate = totalDms > 0 ? Math.round((successfulDms / totalDms) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Direct Messages (DMs)</h1>
          <p className="text-sm text-slate-500 mt-0.5">Automated direct messages sent to users from Reel and Post comments</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/dashboard/automations/new">
            <Send className="h-4 w-4 mr-1.5" /> Setup New DM Automation
          </Link>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Total DMs Dispatched</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900">{totalDms}</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Mail className="h-4 w-4" /></div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Delivered Successfully</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-600">{successfulDms}</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 className="h-4 w-4" /></div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Delivery Rate</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-violet-600">{successRate}%</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><UserCheck className="h-4 w-4" /></div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Failed / Blocked</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-red-500">{failedDms}</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertCircle className="h-4 w-4" /></div>
          </div>
        </Card>
      </div>

      {/* DMs Log */}
      {events.length > 0 ? (
        <div className="space-y-3">
          {events.map(event => {
            const isSuccess = event.dm_status === "success";
            const dateStr = new Date(event.created_at).toLocaleString();

            return (
              <Card key={event.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {event.commenter_username ? event.commenter_username[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">
                            To: @{event.commenter_username || "Instagram User"}
                          </span>
                          {event.instagram_accounts && (
                            <span className="text-xs text-slate-400">
                              From: @{event.instagram_accounts.username}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">• {dateStr}</span>
                        </div>

                        {/* Template preview */}
                        {event.automations?.private_message && (
                          <div className="mt-2 p-3 bg-violet-50/70 border border-violet-100 rounded-xl text-xs text-slate-800 whitespace-pre-wrap max-w-xl">
                            {event.automations.private_message
                              .replace("{{first_name}}", event.commenter_username?.split("_")[0] || "there")
                              .replace("{{username}}", event.commenter_username || "there")}
                          </div>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                          <span>
                            Trigger: Commented &ldquo;<strong className="text-slate-700">{event.comment_text}</strong>&rdquo;
                          </span>
                          {event.keyword_matched && (
                            <Badge variant="outline" className="text-violet-700 bg-white">
                              Keyword: {event.keyword_matched}
                            </Badge>
                          )}
                          {event.automations && (
                            <Link href={`/dashboard/automations/${event.automations.id}`} className="text-violet-600 hover:underline">
                              {event.automations.name}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={isSuccess ? "success" : event.dm_status === "failed" ? "destructive" : "secondary"}>
                        {isSuccess ? "Delivered to Inbox" : event.dm_status || "Pending"}
                      </Badge>
                    </div>
                  </div>

                  {event.error_message && (
                    <div className="mt-3 p-2 bg-red-50 rounded-lg text-xs text-red-600">
                      Reason: {event.error_message}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 mb-4">
              <Mail className="h-7 w-7 text-violet-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No DM dispatches yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              When users comment keywords on your Reels & Posts, our automated Private Reply engine will dispatch direct messages straight into their inbox.
            </p>
            <Button asChild>
              <Link href="/dashboard/automations/new">Create DM Automation</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
