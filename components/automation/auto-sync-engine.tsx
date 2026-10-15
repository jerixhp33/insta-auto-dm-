"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface SyncResult {
  success: boolean;
  processed: number;
  details?: Array<{
    commentId: string;
    commenterUsername?: string;
    text: string;
    reply: boolean;
    dm: boolean;
  }>;
}

export function AutoSyncEngine() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const router = useRouter();
  const syncingRef = useRef(false);

  const runSync = useCallback(async (isManual = false) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const res = await fetch("/api/instagram/sync-comments", {
        method: "POST",
        cache: "no-store",
      });

      const data: SyncResult = await res.json();
      setLastSyncTime(new Date());

      if (data.processed > 0) {
        const commenter = data.details?.[0]?.commenterUsername;
        toast({
          title: "🚀 Auto-Reply & DM Sent!",
          description: commenter
            ? `Replied to @${commenter} and dispatched private DM.`
            : `Processed ${data.processed} comment(s) and dispatched replies.`,
          variant: "success",
        });
        // Refresh server components to show updated event counts
        router.refresh();
      } else if (isManual) {
        toast({
          title: "Scan Complete",
          description: "All recent comments are already up to date.",
          variant: "default",
        });
      }
    } catch (e: any) {
      if (isManual) {
        toast({
          title: "Sync Warning",
          description: e?.message || "Sync check completed with warnings.",
          variant: "destructive",
        });
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [router]);

  // Initial sync on mount + recurring background scan every 15 seconds
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      runSync(false);
    }, 2000);

    const interval = setInterval(() => {
      runSync(false);
    }, 15000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [runSync]);

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-medium text-emerald-700 shadow-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-semibold">Engine Active</span>
        <span className="text-[10px] text-emerald-600/70 border-l border-emerald-200 pl-1.5 ml-0.5">
          {isSyncing ? "Scanning..." : lastSyncTime ? "Live" : "Starting..."}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => runSync(true)}
        disabled={isSyncing}
        className="h-8 gap-1.5 text-xs font-medium border-slate-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
        title="Trigger an immediate scan for new Instagram comments across all Reels and Posts"
      >
        <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isSyncing ? "animate-spin text-violet-600" : ""}`} />
        <span>{isSyncing ? "Scanning..." : "Sync Now"}</span>
      </Button>
    </div>
  );
}
