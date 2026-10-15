"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Unlink, CheckCircle2 } from "lucide-react";

interface AccountCardActionsProps {
  accountId: string;
  username: string;
  status: string;
  workspaceId: string;
}

export function AccountCardActions({ accountId, username, status, workspaceId }: AccountCardActionsProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/instagram/refresh-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Sync failed");

      toast({
        variant: "success",
        title: "Media Synced!",
        description: data.message || `Refreshed posts and reels for @${username}.`,
      });
      router.refresh();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: e?.message || "Could not fetch media from Instagram.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        `Are you sure you want to disconnect @${username}? This will pause automations using this account.`
      )
    ) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/instagram/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Disconnect failed");

      toast({
        variant: "success",
        title: "Account Disconnected",
        description: `@${username} has been disconnected.`,
      });
      router.refresh();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Disconnect Failed",
        description: e?.message || "Failed to disconnect account.",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSyncing || status !== "connected"}
        className="flex-1 gap-1.5 text-xs font-medium"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-violet-600" : ""}`} />
        <span>{isSyncing ? "Syncing..." : "Sync Posts & Reels"}</span>
      </Button>

      {status === "connected" ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5 text-xs font-medium"
        >
          <Unlink className="h-3.5 w-3.5" />
          <span>{isDisconnecting ? "Disconnecting..." : "Disconnect"}</span>
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          asChild
          className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 text-xs font-medium"
        >
          <a href={`/api/instagram/connect?workspace_id=${workspaceId}`}>
            <span>Reconnect</span>
          </a>
        </Button>
      )}
    </div>
  );
}
