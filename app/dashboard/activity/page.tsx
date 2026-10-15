import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ActivityFeed } from "@/components/activity/activity-feed";

interface EventRow {
  id: string;
  status: string;
  comment_text: string;
  commenter_username: string | null;
  keyword_matched: string | null;
  public_reply_status: string | null;
  dm_status: string | null;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  automations: { name: string } | null;
}
interface MemberRow { workspace_id: string; }

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawMember } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const memberRecord = rawMember as MemberRow | null;
  const workspaceId = memberRecord?.workspace_id;

  const { data: rawEvents } = await supabase
    .from("automation_events")
    .select(
      "id, status, comment_text, commenter_username, keyword_matched, public_reply_status, dm_status, retry_count, error_message, created_at, updated_at, automations(name)"
    )
    .eq("workspace_id", workspaceId || "")
    .order("created_at", { ascending: false })
    .limit(100);

  const events = (rawEvents || []) as unknown as EventRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Live stream of incoming comments, auto-likes, public replies, and private DMs
        </p>
      </div>

      <ActivityFeed initialEvents={events} />
    </div>
  );
}
