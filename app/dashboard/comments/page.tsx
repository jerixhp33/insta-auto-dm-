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
import { CommentsFeed } from "@/components/comments/comments-feed";

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

      {/* Interactive Comment Activity Feed */}
      <CommentsFeed initialEvents={events as any} />
    </div>
  );
}
