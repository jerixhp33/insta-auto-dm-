"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Camera, Zap, MessageCircle, Mail,
  Package, BarChart2, FileText, Activity, Settings,
  ChevronDown, LogOut, Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/instagram", label: "Instagram", icon: Camera },
  { href: "/dashboard/automations", label: "Automations", icon: Zap },
  { href: "/dashboard/comments", label: "Comments", icon: MessageCircle },
  { href: "/dashboard/messages", label: "Messages", icon: Mail },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/templates", label: "Templates", icon: FileText },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  workspaceName?: string;
}

export function Sidebar({ userName, userEmail, avatarUrl, workspaceName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-slate-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-slate-900 tracking-tight">InstaAuto</span>
      </div>

      {/* Workspace */}
      <div className="px-4 py-3 border-b border-slate-100">
        <button className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 text-xs font-bold shrink-0">
            {workspaceName?.[0]?.toUpperCase() || "W"}
          </div>
          <span className="flex-1 text-left text-sm font-medium text-slate-700 truncate">
            {workspaceName || "My Workspace"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-violet-50 text-violet-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-violet-600" : "text-slate-400")} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar className="h-8 w-8 shrink-0">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || "User"} />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{userName || "User"}</p>
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
