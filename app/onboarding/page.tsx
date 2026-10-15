"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workspaceSchema, type WorkspaceInput } from "@/schemas";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, CheckCircle, Zap, Camera } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { slugify } from "@/lib/utils";

function makeSlug(name: string) {
  const suffix = Date.now().toString(36).slice(-4);
  return `${slugify(name)}-${suffix}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<WorkspaceInput>({
    resolver: zodResolver(workspaceSchema),
  });

  const onSubmit = async (data: WorkspaceInput) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const slug = makeSlug(data.name);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawWorkspace, error } = await (supabase.from("workspaces") as any)
      .insert({ name: data.name, slug, owner_id: user.id })
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to create workspace",
        description: error.message,
      });
      return;
    }
    if (!rawWorkspace) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: memberError } = await (supabase.from("workspace_members") as any)
      .insert({ workspace_id: rawWorkspace.id, user_id: user.id, role: "owner" });

    if (memberError) {
      console.error("Workspace member insert error:", memberError);
    }

    router.push("/dashboard");
    router.refresh();
  };

  const steps = [
    { icon: CheckCircle, title: "Read comments", color: "text-emerald-500" },
    { icon: CheckCircle, title: "Send replies", color: "text-emerald-500" },
    { icon: CheckCircle, title: "Create automations", color: "text-emerald-500" },
    { icon: CheckCircle, title: "Add products", color: "text-emerald-500" },
    { icon: CheckCircle, title: "Start growing", color: "text-emerald-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 mb-4">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Let&apos;s Get Started</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Connect your Instagram account to begin automating your engagement.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-orange-400">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Connect Your Instagram</p>
              <p className="text-xs text-slate-500">We use Meta&apos;s official API</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {steps.map(({ icon: Icon, title, color }) => (
              <li key={title} className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${color} shrink-0`} />
                <span className="text-sm text-slate-700">{title}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-violet-600" />
            <h2 className="font-semibold text-slate-900">Name your workspace</h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g. My Shop, Brand Name"
                error={!!errors.name}
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Continue to Dashboard
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-500"
              onClick={() => router.push("/dashboard")}
            >
              Skip for now
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
