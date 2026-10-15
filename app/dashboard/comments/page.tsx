import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageCircle, CheckCircle2, XCircle, Clock, Zap, Heart,
  ExternalLink, Filter, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { SyncNowButton } from "@/components/automation/sync-now-button";

interface MemberRow { workspace_id: string; }
interface CommentEventRow {
  id: string;
  commenter_username: string | null;
  comment_text: string;
  keyword_matched: string | null;
  status: string;
  public_reply_status: string | null;
  dm_status: string | null;
  error_message: string | null;
  created_at: string;
  automations: { id: string; name: string } | null;
  instagram_accounts: { username: string } | null;
  instagram_media: { caption: string | null; permalink: string | null; media_type: string } | null;
}

export default async function CommentsPage() {
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
      public_reply_status, dm_status, error_message, created_at,
      automations(id, name),
      instagram_accounts(username),
      instagram_media(caption, permalink, media_type)
    `)
    .eq("workspace_id", workspaceId || "")
    .order("created_at", { ascending: false })
    .limit(100);

  const events = (rawEvents || []) as unknown as CommentEventRow[];

  const totalComments = events.length;
  const successfulReplies = events.filter(e => e.public_reply_status === "success" || e.status === "success").length;
  const dmsSent = events.filter(e => e.dm_status === "success").length;
  const failedEvents = events.filter(e => e.status === "failed" || e.public_reply_status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comments & Activity</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time log of incoming Instagram comments, auto-likes, and replies</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncNowButton />
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/automations/new">
              <Zap className="h-4 w-4 mr-1.5" /> New Automation
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Total Comments Logged</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900">{totalComments}</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><MessageCircle className="h-4 w-4" /></div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Public Replies Sent</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-600">{successfulReplies}</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 className="h-4 w-4" /></div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Direct Messages Triggered</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-violet-600">{dmsSent}</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Zap className="h-4 w-4" /></div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Auto-Likes Given</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-pink-600">{successfulReplies}</span>
            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><Heart className="h-4 w-4" /></div>
          </div>
        </Card>
      </div>

      {/* Comment Activity Feed */}
      {events.length > 0 ? (
        <div className="space-y-3">
          {events.map(event => {
            const isSuccess = event.status === "success" || event.public_reply_status === "success";
            const isFailed = event.status === "failed";
            const dateStr = new Date(event.created_at).toLocaleString();

            return (
              <Card key={event.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {event.commenter_username ? event.commenter_username[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">
                            @{event.commenter_username || "anonymous_user"}
                          </span>
                          {event.instagram_accounts && (
                            <span className="text-xs text-slate-400">
                              on @{event.instagram_accounts.username}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">• {dateStr}</span>
                        </div>

                        <p className="text-sm text-slate-800 mt-1 font-medium bg-slate-50 rounded-lg px-2.5 py-1.5 inline-block">
                          &ldquo;{event.comment_text}&rdquo;
                        </p>

                        <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                          {event.keyword_matched && (
                            <Badge variant="outline" className="text-violet-700 bg-violet-50/70 border-violet-200">
                              Keyword: {event.keyword_matched}
                            </Badge>
                          )}
                          {event.automations && (
                            <span className="text-slate-500">
                              Rule: <Link href={`/dashboard/automations/${event.automations.id}`} className="text-violet-600 hover:underline">{event.automations.name}</Link>
                            </span>
                          )}
                          {event.instagram_media?.permalink && (
                            <a
                              href={event.instagram_media.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-700 inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" /> View Reel/Post
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">Auto-Like:</span>
                          <span className="inline-flex items-center gap-0.5 text-xs text-pink-600 font-medium">
                            <Heart className="h-3 w-3 fill-pink-500 text-pink-500" /> Done
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">Public Reply:</span>
                          <Badge variant={event.public_reply_status === "success" ? "success" : event.public_reply_status === "failed" ? "destructive" : "secondary"}>
                            {event.public_reply_status || "Pending"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">Private DM:</span>
                          <Badge variant={event.dm_status === "success" ? "success" : event.dm_status === "failed" ? "destructive" : "secondary"}>
                            {event.dm_status || "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {event.error_message && (
                    <div className="mt-3 p-2 bg-red-50 rounded-lg text-xs text-red-600">
                      Error: {event.error_message}
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
              <MessageCircle className="h-7 w-7 text-violet-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No comment activity yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              When users comment on your Instagram Reels or Posts matching your trigger keywords, they will appear here with live reply and DM tracking.
            </p>
            <Button asChild>
              <Link href="/dashboard/automations/new">Create Your First Automation</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
