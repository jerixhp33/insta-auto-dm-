/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { automationSchema, type AutomationInput } from "@/schemas";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Zap, X, Plus, ChevronRight, ChevronLeft,
  MessageCircle, Mail, Package, CheckCircle, Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Select Content", icon: Zap },
  { id: 2, title: "Keywords", icon: MessageCircle },
  { id: 3, title: "Replies", icon: Mail },
  { id: 4, title: "Product", icon: Package },
  { id: 5, title: "Review", icon: CheckCircle },
];

export default function NewAutomationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; username: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; price: number | null }[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [dmEnabled, setDmEnabled] = useState(true);
  const [publicReplyEnabled, setPublicReplyEnabled] = useState(true);
  const [publicReply, setPublicReply] = useState("Thanks ❤️ I've sent you the details in DM!");
  const [privateMessage, setPrivateMessage] = useState("Hi {{first_name}} 👋\nHere's the product you asked about.\n\n{{product_name}}\n{{product_price}}\n\nTap below to view the product.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<AutomationInput>({
    resolver: zodResolver(automationSchema) as any,
    defaultValues: { keywords: [], dm_enabled: true, public_reply_enabled: true },
  });

  const automationName = watch("name");

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await (supabase.from("workspace_members") as any)
        .select("workspace_id")
        .eq("user_id", user.id)
        .single();

      if (!member) return;
      setWorkspaceId(member.workspace_id);

      const [{ data: accs }, { data: prods }] = await Promise.all([
        ((supabase.from("instagram_accounts") as any) as any).select("id, username").eq("workspace_id", member.workspace_id).eq("status", "connected"),
        ((supabase.from("products") as any) as any).select("id, name, price").eq("workspace_id", member.workspace_id).eq("status", "active"),
      ]);

      setAccounts(accs || []);
      setProducts(prods || []);
      if (accs?.length) setSelectedAccountId(accs[0].id);
    };
    loadData();
  }, []);

  const addKeyword = () => {
    const k = keyword.trim().toLowerCase();
    if (k && !keywords.includes(k)) {
      setKeywords([...keywords, k]);
      setKeyword("");
    }
  };

  const removeKeyword = (k: string) => setKeywords(keywords.filter(kw => kw !== k));

  const onSave = async (name: string) => {
    if (!workspaceId || !selectedAccountId) {
      toast({ variant: "destructive", title: "Missing required fields", description: "Please select an Instagram account." });
      return;
    }
    if (keywords.length === 0) {
      toast({ variant: "destructive", title: "Add keywords", description: "Add at least one keyword trigger." });
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data: automation, error } = await (supabase.from("automations") as any)
        .insert({
          workspace_id: workspaceId,
          instagram_account_id: selectedAccountId,
          name,
          public_reply: publicReplyEnabled ? publicReply : null,
          private_message: dmEnabled ? privateMessage : null,
          product_id: selectedProductId || null,
          dm_enabled: dmEnabled,
          public_reply_enabled: publicReplyEnabled,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      // Insert keywords
      if (automation && keywords.length > 0) {
        await ((supabase.from("automation_keywords") as any) as any).insert(
          keywords.map(kw => ({
            automation_id: automation.id,
            workspace_id: workspaceId,
            keyword: kw,
          }))
        );
      }

      toast({ variant: "success", title: "Automation created!", description: "Your automation is now active." });
      router.push("/dashboard/automations");
    } catch {
      toast({ variant: "destructive", title: "Failed to create automation", description: "Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Automation</h1>
        <p className="text-sm text-slate-500 mt-0.5">Set up automatic replies and DMs for your Instagram content</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <button
              onClick={() => s.id < step && setStep(s.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                step === s.id ? "bg-violet-600 text-white" :
                s.id < step ? "bg-violet-50 text-violet-600 cursor-pointer hover:bg-violet-100" :
                "bg-slate-100 text-slate-400 cursor-default"
              )}
            >
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold",
                step === s.id ? "bg-white/20 text-white" :
                s.id < step ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-500"
              )}>
                {s.id < step ? "✓" : s.id}
              </span>
              {s.title}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Main form */}
        <div className="lg:col-span-3 space-y-4">
          {/* Step 1: Select Content */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Instagram Content</CardTitle>
                <p className="text-sm text-slate-500">Choose a Reel or Post to automate</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Automation Name</Label>
                  <Input id="name" placeholder="e.g. Price Inquiry Reply" {...register("name")} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram Account</Label>
                  {accounts.length > 0 ? (
                    <div className="grid gap-2">
                      {accounts.map(acc => (
                        <button
                          key={acc.id}
                          onClick={() => setSelectedAccountId(acc.id)}
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
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                      <p className="text-sm text-slate-500">No connected Instagram accounts</p>
                      <Button size="sm" className="mt-2" asChild>
                        <a href="/dashboard/instagram">Connect Instagram</a>
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" className="flex-1 rounded-xl border-2 py-6 text-sm font-medium">
                    Reels
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl border-2 py-6 text-sm font-medium text-slate-400">
                    Posts
                  </Button>
                </div>
                <p className="text-xs text-slate-400 text-center">Or apply automation to all content</p>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Keywords */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Trigger Keywords</CardTitle>
                <p className="text-sm text-slate-500">Add keywords that will activate the automation when someone comments on your post or reel.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="e.g. price, cost, link"
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                  />
                  <Button onClick={addKeyword} disabled={!keyword.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map(kw => (
                      <span key={kw} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 border border-violet-200 px-3 py-1.5 text-sm font-medium text-violet-700">
                        {kw}
                        <button onClick={() => removeKeyword(kw)} className="text-violet-400 hover:text-violet-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">Add at least one keyword to trigger this automation</p>
                )}
                <div className="pt-2">
                  <p className="text-xs text-slate-500 mb-2">Quick add:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["price", "cost", "link", "buy", "interested", "available"].map(suggestion => (
                      <button
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
          )}

          {/* Step 3: Replies */}
          {step === 3 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Public Comment Reply</CardTitle>
                    <Switch checked={publicReplyEnabled} onCheckedChange={setPublicReplyEnabled} />
                  </div>
                </CardHeader>
                {publicReplyEnabled && (
                  <CardContent>
                    <Textarea
                      value={publicReply}
                      onChange={e => setPublicReply(e.target.value)}
                      placeholder="Public reply to show on comment..."
                      rows={3}
                    />
                    <p className="text-xs text-slate-400 mt-1.5">{publicReply.length}/2200 characters</p>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Private Message (DM)</CardTitle>
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
          )}

          {/* Step 4: Product */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Product</CardTitle>
                <p className="text-sm text-slate-500">Choose the product to include in your DM</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {products.length > 0 ? (
                  <>
                    <button
                      onClick={() => setSelectedProductId("")}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                        !selectedProductId ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-violet-200"
                      )}
                    >
                      <span className="text-sm text-slate-500">No product — send message only</span>
                    </button>
                    {products.map(product => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProductId(product.id)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                          selectedProductId === product.id ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-violet-200"
                        )}
                      >
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                          {product.price && <p className="text-xs text-slate-500">₹{product.price}</p>}
                        </div>
                        {selectedProductId === product.id && <CheckCircle className="ml-auto h-4 w-4 text-violet-600 shrink-0" />}
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                    <p className="text-sm text-slate-500 mb-2">No products yet</p>
                    <Button size="sm" asChild variant="outline">
                      <a href="/dashboard/products/new" target="_blank">Add Product</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Activate</CardTitle>
                <p className="text-sm text-slate-500">Check your automation before activating</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Name</span>
                    <span className="font-medium text-slate-900">{automationName || "Unnamed"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Keywords</span>
                    <span className="font-medium text-slate-900">{keywords.length} keywords</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Public Reply</span>
                    <Badge variant={publicReplyEnabled ? "success" : "secondary"}>{publicReplyEnabled ? "On" : "Off"}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Private DM</span>
                    <Badge variant={dmEnabled ? "success" : "secondary"}>{dmEnabled ? "On" : "Off"}</Badge>
                  </div>
                  {selectedProduct && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Product</span>
                      <span className="font-medium text-violet-600">{selectedProduct.name}</span>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full"
                  loading={isSubmitting}
                  onClick={() => onSave(automationName || "My Automation")}
                >
                  <Zap className="h-4 w-4" />
                  Activate Automation
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {step < 5 && (
              <Button onClick={() => setStep(s => s + 1)} className="flex-1 gap-2">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-24">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Live Preview</span>
            </div>
            <div className="rounded-[2rem] border-[3px] border-slate-800 bg-slate-900 p-3 shadow-2xl">
              <div className="rounded-[1.5rem] bg-white overflow-hidden">
                {/* Phone status bar */}
                <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-4 rounded bg-slate-400" />
                    <div className="h-1 w-3 rounded bg-slate-400" />
                    <div className="h-3 w-5 rounded border border-slate-400 flex items-center px-0.5"><div className="h-1.5 w-full rounded bg-slate-400" /></div>
                  </div>
                </div>

                {/* Chat header */}
                <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">@{accounts.find(a => a.id === selectedAccountId)?.username || "your_account"}</p>
                    <p className="text-[10px] text-slate-500">Instagram Direct</p>
                  </div>
                </div>

                {/* Comment preview */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
