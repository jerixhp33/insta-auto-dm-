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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { User, Building2, Shield, Save, Copy, Check, Lock, Webhook, Heart } from "lucide-react";

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Automation preference
  const [autoLikeEnabled, setAutoLikeEnabled] = useState(true);

  const { register: registerProfile, handleSubmit: handleProfileSubmit, reset: resetProfile } = useForm({
    defaultValues: { full_name: "", email: "" }
  });

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

  const onChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ variant: "destructive", title: "Password too short", description: "Must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match" });
      return;
    }
    setIsChangingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ variant: "success", title: "Password changed successfully" });
      setShowPasswordForm(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to update password", description: err?.message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ variant: "success", title: "Copied to clipboard!" });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/instagram`
    : "https://insta-auto-dm-six.vercel.app/api/webhooks/instagram";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account, workspace, and automation preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-base">Profile Information</CardTitle>
          </div>
          <CardDescription>Update your personal display name and account details</CardDescription>
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
              <p className="text-xs text-slate-400">Email cannot be changed directly</p>
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
            <CardTitle className="text-base">Workspace</CardTitle>
          </div>
          <CardDescription>Manage your workspace name and team scope</CardDescription>
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

      {/* Webhook & Meta Integration Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-base">Meta Webhook Configuration</CardTitle>
          </div>
          <CardDescription>Use these exact credentials in your Meta Developer Dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Callback URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs bg-slate-50" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(webhookUrl, "url")}
                className="shrink-0"
              >
                {copiedField === "url" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Verify Token</Label>
            <div className="flex gap-2">
              <Input readOnly value="autome_webhook_verify_token_98741" className="font-mono text-xs bg-slate-50" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard("autome_webhook_verify_token_98741", "token")}
                className="shrink-0"
              >
                {copiedField === "token" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                <p className="text-sm font-medium text-slate-900">Auto-Like Matched Comments</p>
              </div>
              <p className="text-xs text-slate-500">Automatically like comments before dispatching reply and DM</p>
            </div>
            <Switch
              checked={autoLikeEnabled}
              onCheckedChange={checked => {
                setAutoLikeEnabled(checked);
                toast({ variant: "success", title: checked ? "Auto-like enabled" : "Auto-like disabled" });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-base">Security & Password</CardTitle>
          </div>
          <CardDescription>Manage your security credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Account Password</p>
              <p className="text-xs text-slate-500">Update or reset your current password</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              {showPasswordForm ? "Cancel" : "Change Password"}
            </Button>
          </div>

          {showPasswordForm && (
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
              <Button
                size="sm"
                onClick={onChangePassword}
                loading={isChangingPassword}
                className="w-full"
              >
                Update Password
              </Button>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Delete Account</p>
              <p className="text-xs text-slate-500">Permanently delete your account, connected accounts, and automations</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to permanently delete your account? This action cannot be reversed.")) {
                  toast({ variant: "destructive", title: "Account deletion requested", description: "Please contact support to complete account removal." });
                }
              }}
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
