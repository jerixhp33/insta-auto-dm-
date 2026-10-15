import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateOAuthUrl, createOAuthState } from "@/lib/instagram/auth";
import { rateLimit, getRateLimitKey } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = rateLimit(getRateLimitKey("oauth-connect", ip), 10, 60_000);
  if (!limited.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  let workspaceId = request.nextUrl.searchParams.get("workspace_id");

  if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
    const { data: rawMember } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const member = rawMember as { workspace_id: string; role: string } | null;
    if (member?.workspace_id) {
      workspaceId = member.workspace_id;
    } else {
      const { data: rawWs } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .single();
      const ws = rawWs as { id: string } | null;
      if (ws?.id) {
        workspaceId = ws.id;
      } else {
        const slug = `ws-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;
        const { data: newWs } = await supabase
          .from("workspaces")
          .insert({
            name: "My Workspace",
            slug,
            owner_id: user.id,
          } as never)
          .select("id")
          .single();

        const createdWs = newWs as { id: string } | null;
        if (createdWs?.id) {
          await supabase.from("workspace_members").insert({
            workspace_id: createdWs.id,
            user_id: user.id,
            role: "owner",
          } as never);
          workspaceId = createdWs.id;
        }
      }
    }
  }

  if (!workspaceId) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  const { data: rawMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  const member = rawMember as { role: string } | null;
  if (!member || !["owner", "admin"].includes(member.role)) {
    const { data: wsOwner } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();
    const ws = wsOwner as { owner_id: string } | null;
    if (ws?.owner_id === user.id) {
      await supabase.from("workspace_members").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: "owner",
      } as never);
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const providerParam = request.nextUrl.searchParams.get("provider");
  const provider = providerParam === "facebook" ? "facebook" : "instagram";
  const state = await createOAuthState(user.id, workspaceId);
  return NextResponse.redirect(generateOAuthUrl(state, provider, origin));
}
