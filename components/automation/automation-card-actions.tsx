"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { MoreVertical, Edit, Copy, Trash2, Power, ExternalLink } from "lucide-react";
import Link from "next/link";

interface AutomationCardActionsProps {
  automation: {
    id: string;
    name: string;
    status: string;
    public_reply?: string | null;
    private_message?: string | null;
    dm_enabled: boolean;
    public_reply_enabled: boolean;
    reply_to_all?: boolean;
    instagram_media_id?: string | null;
    instagram_accounts?: { username: string } | null;
    automation_keywords?: { keyword: string }[];
  };
}

export function AutomationCardActions({ automation }: AutomationCardActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const toggleStatus = async () => {
    setIsUpdating(true);
    const newStatus = automation.status === "active" ? "inactive" : "active";
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("automations") as any)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", automation.id);

      if (error) throw error;
      toast({
        variant: "success",
        title: `Automation ${newStatus === "active" ? "activated" : "paused"}`,
        description: `"${automation.name}" is now ${newStatus}.`,
      });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const duplicateAutomation = async () => {
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await (supabase.from("workspace_members") as any)
        .select("workspace_id")
        .eq("user_id", user.id)
        .single();

      if (!member) return;

      // 1. Fetch full existing automation record
      const { data: orig, error: getErr } = await (supabase.from("automations") as any)
        .select("*, automation_keywords(keyword)")
        .eq("id", automation.id)
        .single();

      if (getErr || !orig) throw getErr;

      // 2. Clone automation row
      const { data: cloned, error: cloneErr } = await (supabase.from("automations") as any)
        .insert({
          workspace_id: member.workspace_id,
          instagram_account_id: orig.instagram_account_id,
          instagram_media_id: orig.instagram_media_id,
          name: `${orig.name} (Copy)`,
          status: "draft",
          public_reply: orig.public_reply,
          private_message: orig.private_message,
          product_id: orig.product_id,
          reply_to_all: orig.reply_to_all,
          dm_enabled: orig.dm_enabled,
          public_reply_enabled: orig.public_reply_enabled,
        })
        .select("id")
        .single();

      if (cloneErr || !cloned) throw cloneErr;

      // 3. Clone keywords
      const keywords = orig.automation_keywords || [];
      if (keywords.length > 0) {
        await (supabase.from("automation_keywords") as any).insert(
          keywords.map((k: any) => ({
            automation_id: cloned.id,
            workspace_id: member.workspace_id,
            keyword: k.keyword,
          }))
        );
      }

      toast({
        variant: "success",
        title: "Automation duplicated!",
        description: `Created "${orig.name} (Copy)" as draft.`,
      });
      router.refresh();
      router.push(`/dashboard/automations/${cloned.id}`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to duplicate automation",
        description: err?.message || "Something went wrong.",
      });
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const deleteAutomation = async () => {
    if (!confirm(`Are you sure you want to delete "${automation.name}"? This action cannot be undone.`)) return;
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("automations") as any).delete().eq("id", automation.id);
      if (error) throw error;
      toast({ variant: "success", title: "Automation deleted" });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Failed to delete automation" });
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
      >
        <MoreVertical className="h-4 w-4 text-slate-500" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg text-xs space-y-0.5">
            <Link
              href={`/dashboard/automations/${automation.id}`}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 font-medium"
              onClick={() => setIsOpen(false)}
            >
              <Edit className="h-3.5 w-3.5 text-slate-500" />
              <span>Edit Automation</span>
            </Link>

            <button
              type="button"
              onClick={duplicateAutomation}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 font-medium text-left"
            >
              <Copy className="h-3.5 w-3.5 text-slate-500" />
              <span>Duplicate</span>
            </button>

            <button
              type="button"
              onClick={toggleStatus}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 font-medium text-left"
            >
              <Power className={`h-3.5 w-3.5 ${automation.status === "active" ? "text-amber-500" : "text-emerald-500"}`} />
              <span>{automation.status === "active" ? "Pause Automation" : "Activate"}</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              onClick={deleteAutomation}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-red-600 hover:bg-red-50 font-medium text-left"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AutomationToggleButton({
  automationId,
  currentStatus,
  automationName,
}: {
  automationId: string;
  currentStatus: string;
  automationName: string;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setIsUpdating(true);
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("automations") as any)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", automationId);

      if (error) throw error;
      toast({
        variant: "success",
        title: `Automation ${newStatus === "active" ? "activated" : "paused"}`,
        description: `"${automationName}" is now ${newStatus}.`,
      });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Button
      variant={currentStatus === "active" ? "secondary" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={isUpdating}
      className="flex-1"
    >
      {isUpdating
        ? "Updating..."
        : currentStatus === "active"
        ? "Pause"
        : "Activate"}
    </Button>
  );
}
