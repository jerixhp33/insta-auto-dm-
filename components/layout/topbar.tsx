"use client";

import React from "react";
import { Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TopbarProps {
  title?: string;
  userName?: string;
  avatarUrl?: string;
  
}

export function Topbar({ title, userName, avatarUrl }: TopbarProps) {
  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 lg:px-6">
      {/* Mobile: logo + menu */}
      <div className="flex items-center gap-3 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold text-slate-900">InstaAuto</span>
      </div>

      {/* Title (desktop) */}
      {title && (
        <h1 className="hidden lg:block text-lg font-semibold text-slate-900">{title}</h1>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative text-slate-500">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </Button>
        <Avatar className="h-8 w-8 cursor-pointer lg:hidden">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || "User"} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
