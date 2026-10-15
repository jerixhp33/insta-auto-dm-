import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { account_id } = await request.json();

    if (!account_id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    // Verify workspace membership
    const { data: member } = await (supabase.from("workspace_members") as any)
      .select("workspace_id")
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    // Update account status to disconnected
    const { error: updateErr } = await (supabase.from("instagram_accounts") as any)
      .update({
        status: "disconnected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", account_id)
      .eq("workspace_id", member.workspace_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Also pause active automations associated with this account
    await (supabase.from("automations") as any)
      .update({
        status: "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("instagram_account_id", account_id);

    return NextResponse.json({ success: true, message: "Account disconnected successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
