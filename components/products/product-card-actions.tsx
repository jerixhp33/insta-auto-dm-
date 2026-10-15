"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { MoreVertical, Edit, Trash2, Power, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ProductCardActionsProps {
  product: {
    id: string;
    name: string;
    status: string;
    url?: string | null;
  };
}

export function ProductCardActions({ product }: ProductCardActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const toggleStatus = async () => {
    setIsUpdating(true);
    const newStatus = product.status === "active" ? "inactive" : "active";
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("products") as any)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", product.id);

      if (error) throw error;
      toast({
        variant: "success",
        title: `Product ${newStatus === "active" ? "activated" : "deactivated"}`,
      });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Failed to update product status" });
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const deleteProduct = async () => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("products") as any).delete().eq("id", product.id);
      if (error) throw error;
      toast({ variant: "success", title: "Product deleted" });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Failed to delete product" });
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
        className="shrink-0 -mr-1"
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
              href={`/dashboard/products/${product.id}`}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 font-medium"
              onClick={() => setIsOpen(false)}
            >
              <Edit className="h-3.5 w-3.5 text-slate-500" />
              <span>Edit Details</span>
            </Link>

            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 font-medium"
                onClick={() => setIsOpen(false)}
              >
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                <span>Visit Link</span>
              </a>
            )}

            <button
              type="button"
              onClick={toggleStatus}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 font-medium text-left"
            >
              <Power className={`h-3.5 w-3.5 ${product.status === "active" ? "text-amber-500" : "text-emerald-500"}`} />
              <span>{product.status === "active" ? "Set Inactive" : "Set Active"}</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              onClick={deleteProduct}
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
