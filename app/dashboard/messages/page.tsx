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
import { MessagesFeed } from "@/components/messages/messages-feed";

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

      {/* Interactive DMs Log */}
      <MessagesFeed initialEvents={events as any} />
    </div>
  );
}
