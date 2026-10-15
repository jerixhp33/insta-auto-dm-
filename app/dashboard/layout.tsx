import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, email")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as { full_name: string | null; avatar_url: string | null; email: string } | null;

  // Get first workspace
  const { data: rawMember } = await supabase
    .from("workspace_members")
    .select("workspaces(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  const memberRecord = rawMember as { workspaces: { id: string; name: string } | null } | null;

  const workspace = memberRecord?.workspaces;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar
          userName={profile?.full_name || user.email?.split("@")[0]}
          userEmail={profile?.email || user.email}
          avatarUrl={profile?.avatar_url || undefined}
          workspaceName={workspace?.name}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          userName={profile?.full_name || user.email?.split("@")[0]}
          avatarUrl={profile?.avatar_url || undefined}
        />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
