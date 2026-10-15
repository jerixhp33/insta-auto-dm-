/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Zap, X, Plus, ChevronLeft,
  Mail, Package, CheckCircle, Smartphone,
  Layers, Video, Image as ImageIcon, RefreshCw, ExternalLink, Heart, Trash2, Save,
  Sparkles, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  instagram_media_id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  thumbnail_url?: string;
  media_url?: string;
  caption?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

export default function EditAutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const automationId = resolvedParams.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [keyword, setKeyword] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; username: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; price: number | null }[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [dmEnabled, setDmEnabled] = useState(true);
  const [publicReplyEnabled, setPublicReplyEnabled] = useState(true);
  const [publicReply, setPublicReply] = useState("");
  const [privateMessage, setPrivateMessage] = useState("");

  // Target content state
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<"all" | "reels" | "posts">("all");
  const [selectedMediaId, setSelectedMediaId] = useState<string>("");

  const fetchMedia = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setIsLoadingMedia(true);
    try {
      const res = await fetch(`/api/instagram/media?account_id=${accountId}`);
      const data = await res.json();
      if (data.media) {
        setMediaList(data.media);
      }
    } catch (err) {
      console.error("Error fetching media:", err);
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: member } = await (supabase.from("workspace_members") as any)
        .select("workspace_id")
        .eq("user_id", user.id)
        .single();

      if (!member) return;
      setWorkspaceId(member.workspace_id);

      const [{ data: accs }, { data: prods }, { data: auto, error }] = await Promise.all([
        ((supabase.from("instagram_accounts") as any) as any).select("id, username").eq("workspace_id", member.workspace_id).eq("status", "connected"),
        ((supabase.from("products") as any) as any).select("id, name, price").eq("workspace_id", member.workspace_id).eq("status", "active"),
        ((supabase.from("automations") as any) as any).select("*, automation_keywords(keyword)").eq("id", automationId).eq("workspace_id", member.workspace_id).single(),
      ]);

      if (error || !auto) {
        toast({ variant: "destructive", title: "Automation not found" });
        router.push("/dashboard/automations");
        return;
      }

      setAccounts(accs || []);
      setProducts(prods || []);
      setName(auto.name || "");
      setStatus(auto.status === "active" ? "active" : "inactive");
      setSelectedAccountId(auto.instagram_account_id || "");
      setSelectedProductId(auto.product_id || "");
      setDmEnabled(auto.dm_enabled);
      setPublicReplyEnabled(auto.public_reply_enabled);
      setPublicReply(auto.public_reply || "");
      setPrivateMessage(auto.private_message || "");

      const kwList = (auto.automation_keywords || []).map((k: any) => k.keyword);
      setKeywords(kwList);

      if (auto.instagram_media_id) {
        setTargetType("specific");
        setSelectedMediaId(auto.instagram_media_id);
      } else {
        setTargetType("all");
      }

      if (auto.instagram_account_id) {
        fetchMedia(auto.instagram_account_id);
      }

      setIsLoading(false);
    };
    loadData();
  }, [automationId, router, fetchMedia]);

  const addKeyword = () => {
    const k = keyword.trim().toLowerCase();
    if (k && !keywords.includes(k)) {
      setKeywords([...keywords, k]);
      setKeyword("");
    }
  };

  const removeKeyword = (k: string) => setKeywords(keywords.filter(kw => kw !== k));

  const onUpdate = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    if (keywords.length === 0) {
      toast({ variant: "destructive", title: "Add keywords", description: "At least one keyword trigger is required." });
      return;
    }
    if (targetType === "specific" && !selectedMediaId) {
      toast({ variant: "destructive", title: "Select a Reel or Post", description: "Choose which Reel or Post to target, or switch to All Content." });
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("automations") as any)
        .update({
          name,
          status,
          instagram_account_id: selectedAccountId,
          instagram_media_id: targetType === "specific" && selectedMediaId ? selectedMediaId : null,
          reply_to_all: targetType === "all",
          public_reply: publicReplyEnabled ? publicReply : null,
          private_message: dmEnabled ? privateMessage : null,
          product_id: selectedProductId || null,
          dm_enabled: dmEnabled,
          public_reply_enabled: publicReplyEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", automationId);

      if (error) throw error;

      // Update keywords
      await (supabase.from("automation_keywords") as any).delete().eq("automation_id", automationId);
      if (keywords.length > 0 && workspaceId) {
        await (supabase.from("automation_keywords") as any).insert(
          keywords.map(kw => ({
            automation_id: automationId,
            workspace_id: workspaceId,
            keyword: kw,
          }))
        );
      }

      toast({ variant: "success", title: "Saved successfully", description: "Your automation has been updated." });
    } catch {
      toast({ variant: "destructive", title: "Failed to update automation" });
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Are you sure you want to delete this automation? This action cannot be undone.")) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      await (supabase.from("automations") as any).delete().eq("id", automationId);
      toast({ variant: "success", title: "Automation deleted" });
      router.push("/dashboard/automations");
    } catch {
      toast({ variant: "destructive", title: "Failed to delete automation" });
      setIsDeleting(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedMedia = mediaList.find(m => m.id === selectedMediaId);

  const filteredMedia = mediaList.filter(m => {
    if (mediaFilter === "reels") return m.media_type === "VIDEO";
    if (mediaFilter === "posts") return m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM";
    return true;
  });

  const reelsCount = mediaList.filter(m => m.media_type === "VIDEO").length;
  const postsCount = mediaList.filter(m => m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM").length;

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
        <p className="text-sm text-slate-500">Loading automation settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/automations")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Automation</h1>
            <p className="text-sm text-slate-500">{name || "Untitled"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            loading={isDeleting}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button
            size="sm"
            onClick={onUpdate}
            loading={isSaving}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form controls */}
        <div className="lg:col-span-3 space-y-5">
          {/* Status & Name */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">General Information</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{status === "active" ? "Active" : "Paused"}</span>
                  <Switch
                    checked={status === "active"}
                    onCheckedChange={checked => setStatus(checked ? "active" : "inactive")}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Automation Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Price Inquiry Reply"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Instagram Account</Label>
                <div className="grid gap-2">
                  {accounts.map(acc => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccountId(acc.id);
                        fetchMedia(acc.id);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                        selectedAccountId === acc.id ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-violet-200"
                      )}
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-sm font-bold">
                        {acc.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-900">@{acc.username}</span>
                      {selectedAccountId === acc.id && <CheckCircle className="ml-auto h-4 w-4 text-violet-600" />}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Target Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Content Target</CardTitle>
              <CardDescription>Choose which Reel, Post, or all content triggers this automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTargetType("all");
                    setSelectedMediaId("");
                  }}
                  className={cn(
                    "flex flex-col items-start p-4 rounded-xl border text-left transition-all",
                    targetType === "all"
                      ? "border-violet-600 bg-violet-50/60 ring-2 ring-violet-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={cn("p-1.5 rounded-lg", targetType === "all" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600")}>
                      <Layers className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-sm text-slate-900">All Content</span>
                  </div>
                  <p className="text-xs text-slate-500">Auto-reply across all existing and upcoming Reels & Posts</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetType("specific");
                    if (selectedAccountId && mediaList.length === 0) {
                      fetchMedia(selectedAccountId);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-start p-4 rounded-xl border text-left transition-all",
                    targetType === "specific"
                      ? "border-violet-600 bg-violet-50/60 ring-2 ring-violet-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={cn("p-1.5 rounded-lg", targetType === "specific" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600")}>
                      <Video className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-sm text-slate-900">Specific Reel / Post</span>
                  </div>
                  <p className="text-xs text-slate-500">Choose a single Reel or Post to target specifically</p>
                </button>
              </div>

              {/* Specific Reel / Post Selector Grid */}
              {targetType === "specific" && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMediaFilter("all")}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                          mediaFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        All ({mediaList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaFilter("reels")}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                          mediaFilter === "reels" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        <Video className="h-3 w-3" /> Reels ({reelsCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaFilter("posts")}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                          mediaFilter === "posts" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        <ImageIcon className="h-3 w-3" /> Posts ({postsCount})
                      </button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchMedia(selectedAccountId)}
                      disabled={isLoadingMedia}
                      className="text-xs h-7 text-slate-500 hover:text-slate-900"
                    >
                      <RefreshCw className={cn("h-3 w-3 mr-1", isLoadingMedia && "animate-spin")} />
                      Refresh
                    </Button>
                  </div>

                  {isLoadingMedia ? (
                    <div className="grid grid-cols-3 gap-3 py-6">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="aspect-square rounded-xl bg-slate-100 animate-pulse" />
                      ))}
                    </div>
                  ) : filteredMedia.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                      {filteredMedia.map(item => {
                        const isSelected = selectedMediaId === item.id;
                        const thumb = item.thumbnail_url || item.media_url;
                        const isVideo = item.media_type === "VIDEO";

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedMediaId(item.id)}
                            className={cn(
                              "group relative flex flex-col rounded-xl overflow-hidden border text-left transition-all",
                              isSelected
                                ? "border-violet-600 ring-2 ring-violet-500 shadow-md"
                                : "border-slate-200 hover:border-slate-300 bg-slate-50"
                            )}
                          >
                            <div className="relative aspect-square w-full bg-slate-200 overflow-hidden">
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={thumb}
                                  alt={item.caption || "Instagram media"}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  {isVideo ? <Video className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
                                </div>
                              )}

                              <div className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium text-white flex items-center gap-1">
                                {isVideo ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                                {isVideo ? "Reel" : "Post"}
                              </div>

                              {isSelected && (
                                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-violet-600 text-white flex items-center justify-center shadow">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </div>
                              )}

                              {item.permalink && (
                                <a
                                  href={item.permalink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="absolute bottom-2 right-2 rounded-md bg-black/60 backdrop-blur-sm p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                                  title="View on Instagram"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>

                            <div className="p-2 bg-white">
                              <p className="text-[11px] text-slate-700 line-clamp-2 leading-tight">
                                {item.caption || "(No caption)"}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                {item.like_count !== undefined && (
                                  <span className="flex items-center gap-0.5">
                                    <Heart className="h-2.5 w-2.5" /> {item.like_count}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                      <p className="text-xs text-slate-500 mb-2">No {mediaFilter !== "all" ? mediaFilter : "posts or reels"} found for this account</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fetchMedia(selectedAccountId)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Try Syncing Again
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Keywords */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Trigger Keywords</CardTitle>
              <CardDescription>When comments match these keywords, the automation runs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="e.g. price, cost, link"
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" onClick={addKeyword} disabled={!keyword.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {keywords.map(kw => (
                    <span key={kw} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 border border-violet-200 px-3 py-1.5 text-sm font-medium text-violet-700">
                      {kw}
                      <button type="button" onClick={() => removeKeyword(kw)} className="text-violet-400 hover:text-violet-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-red-500">Add at least one trigger keyword.</p>
              )}

              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-2">Quick add:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["price", "cost", "link", "buy", "interested", "available"].map(suggestion => (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => !keywords.includes(suggestion) && setKeywords([...keywords, suggestion])}
                      disabled={keywords.includes(suggestion)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Replies & DM */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Public Comment Reply</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">Replies publicly + auto-likes the user comment</p>
                  </div>
                  <Switch checked={publicReplyEnabled} onCheckedChange={setPublicReplyEnabled} />
                </div>
              </CardHeader>
              {publicReplyEnabled && (
                <CardContent className="space-y-3">
                  <Textarea
                    value={publicReply}
                    onChange={e => setPublicReply(e.target.value)}
                    placeholder="Public reply to show on comment..."
                    rows={3}
                  />
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{publicReply.length}/2200 characters</span>
                    <span className="flex items-center gap-1 text-violet-600 font-medium text-[11px]">
                      <Sparkles className="h-3 w-3" />
                      Anti-Spam Spin-tax Supported
                    </span>
                  </div>

                  <div className="rounded-xl bg-violet-50/70 border border-violet-100 p-2.5 text-xs text-violet-900 space-y-1.5">
                    <p className="font-semibold flex items-center gap-1 text-[11px]">
                      <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />
                      Rotate replies to avoid Instagram spam filters:
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Use <code>{`{variation 1|variation 2|variation 3}`}</code> or enter different lines. The engine randomly selects one per comment.
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setPublicReply("{Sent to your DM! ❤️|Check your inbox! ✨|Details sent via DM 👋}")}
                        className="rounded-lg bg-white border border-violet-200 px-2 py-0.5 text-[11px] text-violet-700 hover:bg-violet-100 transition-colors shadow-2xs"
                      >
                        Insert Spin-Tax Preset 1
                      </button>
                      <button
                        type="button"
                        onClick={() => setPublicReply("{Just sent you a DM! 🚀|Sent! Check your inbox ✨|DM sent! Let me know if you get it!}")}
                        className="rounded-lg bg-white border border-violet-200 px-2 py-0.5 text-[11px] text-violet-700 hover:bg-violet-100 transition-colors shadow-2xs"
                      >
                        Insert Spin-Tax Preset 2
                      </button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Private Direct Message (DM)</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">Sends an instant DM to the commenter</p>
                  </div>
                  <Switch checked={dmEnabled} onCheckedChange={setDmEnabled} />
                </div>
              </CardHeader>
              {dmEnabled && (
                <CardContent className="space-y-3">
                  <Textarea
                    value={privateMessage}
                    onChange={e => setPrivateMessage(e.target.value)}
                    placeholder="Private DM to send..."
                    rows={6}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {["{{first_name}}", "{{product_name}}", "{{product_price}}", "{{product_url}}"].map(v => (
                      <button
                        type="button"
                        key={v}
                        onClick={() => setPrivateMessage(prev => prev + " " + v)}
                        className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-mono text-violet-600 hover:bg-violet-50 transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">{privateMessage.length}/1000 characters</p>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Product link */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Linked Product</CardTitle>
              <CardDescription>Optional product details to inject into DM message variables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                type="button"
                onClick={() => setSelectedProductId("")}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  !selectedProductId ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-violet-200"
                )}
              >
                <span className="text-sm text-slate-500">No product — text message only</span>
              </button>
              {products.map(product => (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    selectedProductId === product.id ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-violet-200"
                  )}
                >
                  <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                    {product.price && <p className="text-xs text-slate-500">₹{product.price}</p>}
                  </div>
                  {selectedProductId === product.id && <CheckCircle className="ml-auto h-4 w-4 text-violet-600 shrink-0" />}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Sidebar */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Live Preview</span>
            </div>

            <div className="rounded-[2rem] border-[3px] border-slate-800 bg-slate-900 p-3 shadow-2xl">
              <div className="rounded-[1.5rem] bg-white overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-4 rounded bg-slate-400" />
                    <div className="h-1 w-3 rounded bg-slate-400" />
                    <div className="h-3 w-5 rounded border border-slate-400 flex items-center px-0.5"><div className="h-1.5 w-full rounded bg-slate-400" /></div>
                  </div>
                </div>

                <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">@{accounts.find(a => a.id === selectedAccountId)?.username || "your_account"}</p>
                    <p className="text-[10px] text-slate-500">Instagram Direct</p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-br-sm bg-slate-100 px-3 py-2 max-w-[80%]">
                      <p className="text-xs text-slate-700">{keywords[0] ? `${keywords[0]}?` : "price?"}</p>
                    </div>
                  </div>

                  {publicReplyEnabled && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-sm bg-violet-600 px-3 py-2 max-w-[85%]">
                        <p className="text-xs text-white">{publicReply || "Thanks! I've sent you the details in DM!"}</p>
                      </div>
                    </div>
                  )}

                  {dmEnabled && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-sm bg-violet-50 border border-violet-100 px-3 py-2.5 max-w-[90%] space-y-1.5">
                        <p className="text-[11px] text-slate-700 whitespace-pre-wrap">
                          {privateMessage
                            .replace("{{first_name}}", "Sarah")
                            .replace("{{product_name}}", selectedProduct?.name || "Custom Poster")
                            .replace("{{product_price}}", selectedProduct?.price ? `₹${selectedProduct.price}` : "₹499")
                            .replace("{{product_url}}", "View Product →")}
                        </p>
                        {selectedProduct && (
                          <div className="rounded-lg border border-violet-200 bg-white p-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                <Package className="h-4 w-4 text-violet-600" />
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-slate-900">{selectedProduct.name}</p>
                                <p className="text-[10px] text-violet-600">₹{selectedProduct.price}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button
              className="w-full gap-2"
              onClick={onUpdate}
              loading={isSaving}
            >
              <Save className="h-4 w-4" /> Save Automation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
