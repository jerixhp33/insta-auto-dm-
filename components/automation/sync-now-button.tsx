"use client";

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function SyncNowButton({ variant = "outline", size = "default", className = "" }: { variant?: any; size?: any; className?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/instagram/sync-comments", {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json();

      if (data.processed > 0) {
        toast({
          title: "🚀 Sync & Auto-Reply Success!",
          description: `Scanned recent posts. Processed ${data.processed} comment(s) and dispatched replies!`,
          variant: "success",
        });
        router.refresh();
      } else {
        toast({
          title: "All Comments Up to Date",
          description: "Scanned recent reels & posts. No new unprocessed comments found.",
          variant: "default",
        });
      }
    } catch (e: any) {
      toast({
        title: "Sync Issue",
        description: e?.message || "Failed to trigger comment sync.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSync}
      disabled={loading}
      className={`gap-2 ${className}`}
    >
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-violet-600" : ""}`} />
      <span>{loading ? "Scanning & Replying..." : "Scan & Reply Now"}</span>
    </Button>
  );
}
