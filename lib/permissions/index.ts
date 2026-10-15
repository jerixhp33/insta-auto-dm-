import type { WorkspaceRole } from "@/types/database";

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export function hasRole(userRole: WorkspaceRole, requiredRole: WorkspaceRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canManageAutomations(role: WorkspaceRole): boolean {
  return hasRole(role, "editor");
}

export function canManageProducts(role: WorkspaceRole): boolean {
  return hasRole(role, "editor");
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return hasRole(role, "admin");
}

export function canManageInstagram(role: WorkspaceRole): boolean {
  return hasRole(role, "admin");
}

export function canDeleteWorkspace(role: WorkspaceRole): boolean {
  return role === "owner";
}

export function canViewAnalytics(role: WorkspaceRole): boolean {
  return hasRole(role, "viewer");
}
