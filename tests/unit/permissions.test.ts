import {
  hasRole,
  canManageAutomations,
  canManageProducts,
  canManageMembers,
  canManageInstagram,
  canDeleteWorkspace,
  canViewAnalytics,
} from "@/lib/permissions";
import type { WorkspaceRole } from "@/types/database";

describe("hasRole", () => {
  it("owner has all roles", () => {
    const roles: WorkspaceRole[] = ["viewer", "editor", "admin", "owner"];
    roles.forEach(r => expect(hasRole("owner", r)).toBe(true));
  });

  it("viewer cannot meet editor+ requirements", () => {
    expect(hasRole("viewer", "editor")).toBe(false);
    expect(hasRole("viewer", "admin")).toBe(false);
    expect(hasRole("viewer", "owner")).toBe(false);
  });

  it("editor cannot meet admin+ requirements", () => {
    expect(hasRole("editor", "admin")).toBe(false);
    expect(hasRole("editor", "owner")).toBe(false);
  });

  it("admin cannot meet owner requirement", () => {
    expect(hasRole("admin", "owner")).toBe(false);
  });

  it("each role meets its own requirement", () => {
    const roles: WorkspaceRole[] = ["viewer", "editor", "admin", "owner"];
    roles.forEach(r => expect(hasRole(r, r)).toBe(true));
  });
});

describe("permission helpers", () => {
  it("only editors+ can manage automations", () => {
    expect(canManageAutomations("viewer")).toBe(false);
    expect(canManageAutomations("editor")).toBe(true);
    expect(canManageAutomations("admin")).toBe(true);
    expect(canManageAutomations("owner")).toBe(true);
  });

  it("only admins+ can manage members", () => {
    expect(canManageMembers("viewer")).toBe(false);
    expect(canManageMembers("editor")).toBe(false);
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("owner")).toBe(true);
  });

  it("only owners can delete workspace", () => {
    expect(canDeleteWorkspace("admin")).toBe(false);
    expect(canDeleteWorkspace("owner")).toBe(true);
  });

  it("all roles can view analytics", () => {
    const roles: WorkspaceRole[] = ["viewer", "editor", "admin", "owner"];
    roles.forEach(r => expect(canViewAnalytics(r)).toBe(true));
  });

  it("only admins+ can manage Instagram", () => {
    expect(canManageInstagram("viewer")).toBe(false);
    expect(canManageInstagram("editor")).toBe(false);
    expect(canManageInstagram("admin")).toBe(true);
    expect(canManageInstagram("owner")).toBe(true);
  });
});
