/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workspaceSchema, type WorkspaceInput } from "@/schemas";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { User, Building2, Shield, Save } from "lucide-react";

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register: registerProfile, handleSubmit: handleProfileSubmit, reset: resetProfile } = useForm({
    defaultValues: { full_name: "", email: "" }
  });
  // profileErrors unused intentionally - email field is disabled

  const { register: registerWorkspace, handleSubmit: handleWorkspaceSubmit, reset: resetWorkspace, formState: { errors: wsErrors } } = useForm<WorkspaceInput>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "" }
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await (supabase.from("profiles") as any).select("full_name, email").eq("id", user.id).single();
      if (prof) { resetProfile({ full_name: (prof as any).full_name || "", email: (prof as any).email || "" }); }
      const { data: member } = await (supabase.from("workspace_members") as any).select("workspace_id, workspaces(id, name)").eq("user_id", user.id).single();
      const ws = member?.workspaces as { id: string; name: string } | null;
      if (ws) { setWorkspace(ws); resetWorkspace({ name: ws.name }); }
    };
    load();
  }, [resetProfile, resetWorkspace]);

  const saveProfile = async (data: { full_name: string; email: string }) => {
    setIsSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await (supabase.from("profiles") as any).update({ full_name: data.full_name } as never).eq("id", user.id);
    if (error) {
      toast({ variant: "destructive", title: "Failed to save profile" });
    } else {
      toast({ variant: "success", title: "Profile updated" });
    }
    setIsSaving(false);
  };

  const saveWorkspace = async (data: WorkspaceInput) => {
    if (!workspace?.id) return;
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await (supabase.from("workspaces") as any).update({ name: data.name } as never).eq("id", workspace.id);
    if (error) {
      toast({ variant: "destructive", title: "Failed to save workspace" });
    } else {
      toast({ variant: "success", title: "Workspace updated" });
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and workspace</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-violet-600" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit(saveProfile)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" {...registerProfile("full_name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" disabled {...registerProfile("email")} className="bg-slate-50" />
              <p className="text-xs text-slate-400">Email cannot be changed from here</p>
            </div>
            <Button type="submit" loading={isSaving} size="sm">
              <Save className="h-4 w-4" /> Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Workspace */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-600" />
            <CardTitle>Workspace</CardTitle>
          </div>
          <CardDescription>Manage your workspace settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleWorkspaceSubmit(saveWorkspace)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="ws_name">Workspace Name</Label>
              <Input id="ws_name" error={!!wsErrors.name} {...registerWorkspace("name")} />
              {wsErrors.name && <p className="text-xs text-red-500">{wsErrors.name.message}</p>}
            </div>
            <Button type="submit" loading={isSaving} size="sm">
              <Save className="h-4 w-4" /> Save Workspace
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-600" />
            <CardTitle>Security</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Password</p>
              <p className="text-xs text-slate-500">Update your account password</p>
            </div>
            <Button variant="outline" size="sm">Change Password</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Delete Account</p>
              <p className="text-xs text-slate-500">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive" size="sm">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
