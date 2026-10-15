import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Sparkles, LayoutDashboard, Users, Building2, Camera, Zap, Package, Tag, BarChart2, ScrollText, Settings } from "lucide-react";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface ProfileRow { is_admin: boolean; full_name: string | null; email: string; }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: rawProfile } = await supabase.from("profiles").select("is_admin, full_name, email").eq("id", user.id).single();
  const profile = rawProfile as ProfileRow | null;
  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="hidden lg:flex lg:w-60 lg:flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2.5 px-5 border-b border-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900">InstaAuto</span>
            <span className="ml-2 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">ADMIN</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <ul className="space-y-0.5">
            {adminNav.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-slate-100 p-3">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
            ← Back to Dashboard
          </Link>
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-6">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-600">ADMIN MODE</div>
            <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold">
              {profile.full_name?.[0]?.toUpperCase() || "A"}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
