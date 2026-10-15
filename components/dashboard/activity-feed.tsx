import React from "react";
import { formatRelativeTime } from "@/lib/utils";
import { MessageCircle, Mail, Zap, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: string;
  type: "comment" | "dm" | "automation" | "system";
  title: string;
  description: string;
  status: "success" | "failed" | "pending";
  created_at: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  loading?: boolean;
}

const typeIcons = {
  comment: MessageCircle,
  dm: Mail,
  automation: Zap,
  system: CheckCircle,
};

const statusConfig = {
  success: { variant: "success" as const, icon: CheckCircle, label: "Success" },
  failed: { variant: "destructive" as const, icon: XCircle, label: "Failed" },
  pending: { variant: "secondary" as const, icon: Clock, label: "Pending" },
};

export function ActivityFeed({ items, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-9 w-9 rounded-xl bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 rounded bg-slate-100" />
              <div className="h-3 w-32 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Zap className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">No activity yet</p>
        <p className="text-xs text-slate-400 mt-1">Events will appear here once your automations fire</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const TypeIcon = typeIcons[item.type] || Zap;
        const status = statusConfig[item.status];
        return (
          <div key={item.id} className="flex items-start gap-3 rounded-xl p-3 hover:bg-slate-50 transition-colors">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              item.type === "comment" ? "bg-blue-50 text-blue-600" :
              item.type === "dm" ? "bg-violet-50 text-violet-600" :
              "bg-slate-100 text-slate-500"
            }`}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{item.description}</p>
              <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(item.created_at)}</p>
            </div>
            <Badge variant={status.variant} className="shrink-0 mt-0.5">
              {item.status}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
