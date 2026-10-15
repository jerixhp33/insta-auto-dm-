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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  User, Building2, Shield, Save, Copy, Check, Lock, Webhook,
  Heart, Sparkles, Clock, Sliders, RefreshCw
} from "lucide-react";

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<{ id: string; name: string; settings?: any } | null>(null);
  const [workspaceSettings, setWorkspaceSettings] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Automation & AI preferences
  const [autoLikeEnabled, setAutoLikeEnabled] = useState(true);
  const [replyDelay, setReplyDelay] = useState(0);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiPersona, setAiPersona] = useState("Friendly boutique assistant");
  const [geminiKey, setGeminiKey] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const { register: registerProfile, handleSubmit: handleProfileSubmit, reset: resetProfile } = useForm({
    defaultValues: { full_name: "", email: "" },
  });

  const { register: registerWorkspace, handleSubmit: handleWorkspaceSubmit, reset: resetWorkspace, formState: { errors: wsErrors } } = useForm<WorkspaceInput>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await (supabase.from("profiles") as any)
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      if (prof) {
        resetProfile({
          full_name: (prof as any).full_name || "",
          email: (prof as any).email || "",
        });
      }

      const { data: member } = await (supabase.from("workspace_members") as any)
        .select("workspace_id, workspaces(id, name, settings)")
        .eq("user_id", user.id)
        .single();

      const ws = member?.workspaces as { id: string; name: string; settings?: any } | null;
      if (ws) {
        setWorkspace(ws);
        resetWorkspace({ name: ws.name });
        const s = ws.settings || {};
        setWorkspaceSettings(s);
        setAutoLikeEnabled(s.auto_like_enabled !== false);
        setReplyDelay(s.reply_delay_seconds || 0);
        setAiEnabled(s.gemini_ai_enabled === true);
        setAiPersona(s.ai_persona_prompt || "Friendly, helpful store assistant for Instagram shoppers");
        setGeminiKey(s.gemini_api_key || "");
      }
    };
    load();
  }, [resetProfile, resetWorkspace]);

  const saveProfile = async (data: { full_name: string; email: string }) => {
    setIsSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await (supabase.from("profiles") as any)
      .update({ full_name: data.full_name })
      .eq("id", user.id);

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
    const { error } = await (supabase.from("workspaces") as any)
      .update({ name: data.name, updated_at: new Date().toISOString() })
      .eq("id", workspace.id);

    if (error) {
      toast({ variant: "destructive", title: "Failed to save workspace" });
    } else {
      toast({ variant: "success", title: "Workspace updated" });
    }
    setIsSaving(false);
  };

  const saveEngineSettings = async () => {
    if (!workspace?.id) return;
    setIsSavingSettings(true);
    try {
      const supabase = createClient();
      const updated = {
        ...workspaceSettings,
        auto_like_enabled: autoLikeEnabled,
        reply_delay_seconds: Number(replyDelay),
        gemini_ai_enabled: aiEnabled,
        ai_persona_prompt: aiPersona,
        gemini_api_key: geminiKey.trim() || undefined,
      };

      const { error } = await (supabase.from("workspaces") as any)
        .update({
          settings: updated,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workspace.id);

      if (error) throw error;
      setWorkspaceSettings(updated);
      toast({
        variant: "success",
        title: "Settings Saved",
        description: "Your automation engine preferences have been persisted.",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Failed to save settings",
        description: e?.message || "Could not update settings in database.",
      });
    } finally {
      setIsSavingSettings(false);
    }
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
      toast({ variant: "destructive", title: "Password update failed", description: err?.message || "Please try again." });
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

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your workspace, automation engine, and security preferences</p>
      </div>

      {/* Engine & Automation Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-base">Automation Engine Preferences</CardTitle>
          </div>
          <CardDescription>Configure how your automated responses behave on Instagram</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Auto-like */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                <p className="text-sm font-medium text-slate-900">Auto-Like Matched Comments</p>
              </div>
              <p className="text-xs text-slate-500">Automatically heart comments on Reels and Posts when keyword triggers match</p>
            </div>
            <Switch
              checked={autoLikeEnabled}
              onCheckedChange={setAutoLikeEnabled}
            />
          </div>

          <Separator />

          {/* Reply delay */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-violet-600" />
              <Label className="text-sm font-medium text-slate-900">Response Delay (Anti-Bot Humanization)</Label>
            </div>
            <p className="text-xs text-slate-500">Add a natural delay before publishing public reply and sending DM</p>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { sec: 0, label: "Instant (0s)" },
                { sec: 5, label: "Fast (5s)" },
                { sec: 15, label: "Natural (15s)" },
                { sec: 30, label: "Human (30s)" },
              ].map(opt => (
                <button
                  key={opt.sec}
                  type="button"
                  onClick={() => setReplyDelay(opt.sec)}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                    replyDelay === opt.sec
                      ? "border-violet-600 bg-violet-50 text-violet-700 shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Gemini AI Auto-Reply */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-medium text-slate-900">Smart Gemini AI Auto-Reply</p>
                  <Badge variant="outline" className="text-[10px] text-violet-700 bg-violet-50">Experimental</Badge>
                </div>
                <p className="text-xs text-slate-500">Use Gemini to generate natural conversational replies when comments contain questions</p>
              </div>
              <Switch
                checked={aiEnabled}
                onCheckedChange={setAiEnabled}
              />
            </div>

            {aiEnabled && (
              <div className="p-3 bg-violet-50/60 border border-violet-100 rounded-xl space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ai_persona" className="text-xs font-semibold text-slate-700">AI Persona & Tone Instructions</Label>
                  <Textarea
                    id="ai_persona"
                    rows={2}
                    value={aiPersona}
                    onChange={e => setAiPersona(e.target.value)}
                    placeholder="e.g. Friendly and cheerful boutique assistant. Answer questions concisely with emojis."
                    className="text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gemini_key" className="text-xs font-semibold text-slate-700">Custom Gemini API Key (Optional)</Label>
                  <Input
                    id="gemini_key"
                    type="password"
                    placeholder="AIzaSy... (leave blank to use system key)"
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    className="text-xs bg-white"
                  />
                  <p className="text-[10px] text-slate-400">
                    Get a free API key from Google AI Studio. Used to generate contextual replies when comments ask questions.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={saveEngineSettings}
              loading={isSavingSettings}
              size="sm"
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              <span>Save Engine Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-base">Profile Details</CardTitle>
          </div>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit(saveProfile)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" placeholder="Your full name" {...registerProfile("full_name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" disabled className="bg-slate-50 text-slate-500" {...registerProfile("email")} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={isSaving} className="gap-1.5">
                <Save className="h-4 w-4" />
                <span>Save Profile</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Workspace */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-base">Workspace Settings</CardTitle>
          </div>
          <CardDescription>Manage your workspace name and branding</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleWorkspaceSubmit(saveWorkspace)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="workspace_name">Workspace Name</Label>
              <Input
                id="workspace_name"
                placeholder="e.g. My Shop, Brand Name"
                error={!!wsErrors.name}
                {...registerWorkspace("name")}
              />
              {wsErrors.name && <p className="text-xs text-red-500">{wsErrors.name.message}</p>}
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={isSaving} className="gap-1.5">
                <Save className="h-4 w-4" />
                <span>Save Workspace</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Meta Webhook Verification */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-base">Meta Webhook Configuration</CardTitle>
          </div>
          <CardDescription>Credentials to register your Meta Developer webhook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Webhook Callback URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value="https://insta-auto-dm-six.vercel.app/api/webhooks/instagram"
                className="font-mono text-xs bg-slate-50"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard("https://insta-auto-dm-six.vercel.app/api/webhooks/instagram", "webhook")}
                className="shrink-0"
              >
                {copiedField === "webhook" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
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
        </CardContent>
      </Card>
    </div>
  );
}
