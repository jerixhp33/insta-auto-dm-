import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { WorkspaceRole } from "@/types/database";
import { redirect } from "next/navigation";

interface ProfileRow { id: string; is_admin: boolean; full_name: string | null; avatar_url: string | null; email: string; }
interface MemberRow { role: string; workspace_id: string; }

export async function getSession() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data as ProfileRow | null;
}

export async function requireAdmin() {
  const session = await requireAuth();
  const profile = await getProfile(session.user.id);
  if (!profile?.is_admin) redirect("/dashboard");
  return { session, profile };
}

export async function getWorkspaceMembership(workspaceId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("workspace_members").select("role, workspace_id").eq("workspace_id", workspaceId).eq("user_id", userId).single();
  return data as MemberRow | null;
}

export async function requireWorkspaceAccess(workspaceId: string, requiredRole: WorkspaceRole = "viewer") {
  const session = await requireAuth();
  const membership = await getWorkspaceMembership(workspaceId, session.user.id);
  if (!membership) redirect("/dashboard");

  const roleHierarchy: Record<WorkspaceRole, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };
  const memberRole = membership.role as WorkspaceRole;
  if (roleHierarchy[memberRole] < roleHierarchy[requiredRole]) redirect("/dashboard");
  return { session, role: memberRole };
}

export async function getUserWorkspaces(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("workspace_members").select("role, workspaces(*)").eq("user_id", userId);
  return data || [];
}

export async function logActivity(params: {
  workspaceId?: string; userId?: string; action: string; entityType?: string;
  entityId?: string; metadata?: Record<string, unknown>; ipAddress?: string;
}) {
  try {
    const supabase = await createServiceClient();
    await supabase.from("activity_logs").insert({
      workspace_id: params.workspaceId || null,
      user_id: params.userId || null,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null,
    } as never);
  } catch { /* log failures should not break main flow */ }
}
