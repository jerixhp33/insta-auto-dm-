"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Zap,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Mail,
  Heart,
  RefreshCw,
  Sparkles,
  ArrowRight,
  User,
  ShieldCheck,
} from "lucide-react";

interface SimulationResult {
  matched: boolean;
  message?: string;
  automation?: {
    id: string;
    name: string;
    account_username: string | null;
  };
  matched_keyword?: string;
  comment_analyzed?: string;
  commenter?: string;
  actions?: {
    auto_like_comment: boolean;
    auto_like_media: boolean;
    public_reply: {
      enabled: boolean;
      text: string | null;
      has_rotation: boolean;
      original_template: string;
    };
    private_dm: {
      enabled: boolean;
      text: string | null;
      interpolated_vars: Record<string, string>;
      original_template: string;
    };
  };
  suggestions?: string[];
  estimated_execution_time_ms?: number;
}

export function AutomationSimulatorModal({
  defaultAutomationId,
  automationsList = [],
}: {
  defaultAutomationId?: string;
  automationsList?: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [commentText, setCommentText] = useState("Hey! Can I get the link and price?");
  const [commenter, setCommenter] = useState("priya_creator");
  const [selectedAutoId, setSelectedAutoId] = useState(defaultAutomationId || "");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const runSimulation = async () => {
    if (!commentText.trim()) return;
    setIsRunning(true);
    try {
      const res = await fetch("/api/automations/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_text: commentText,
          commenter_username: commenter,
          automation_id: selectedAutoId || undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        matched: false,
        message: "Failed to connect to simulation engine. Please check your network.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-violet-200 bg-violet-50/60 text-violet-700 hover:bg-violet-100 hover:text-violet-800 font-medium gap-2 shadow-sm"
        >
          <FlaskConical className="h-4 w-4 text-violet-600" />
          Test Simulator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Live Automation Simulator
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold border-0">
                  Zero Meta Risk
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Test keywords, rotating replies, and dynamic DMs instantly without a 2nd Instagram account.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Controls */}
          <div className="space-y-3">
            {automationsList.length > 0 && (
              <div>
                <Label className="text-xs font-semibold text-slate-700">Target Automation</Label>
                <select
                  value={selectedAutoId}
                  onChange={(e) => setSelectedAutoId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">⚡ All Active Automations (Auto-Match)</option>
                  {automationsList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-slate-700">Simulated Comment Text</Label>
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="e.g. price, link, send details..."
                className="mt-1"
                onKeyDown={(e) => e.key === "Enter" && runSimulation()}
              />
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[11px] text-slate-400">Quick tests:</span>
                {["price", "link please", "cost", "how much?", "interested"].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setCommentText(sample);
                    }}
                    className="text-[11px] rounded-md bg-slate-100 px-2 py-0.5 text-slate-600 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Simulated Commenter Username</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">@</span>
                <Input
                  value={commenter}
                  onChange={(e) => setCommenter(e.target.value)}
                  placeholder="username"
                  className="pl-7 text-sm"
                />
              </div>
            </div>

            <Button
              onClick={runSimulation}
              disabled={isRunning || !commentText.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium gap-2 py-2.5 shadow-sm"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Testing Matching Engine...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-white" />
                  Simulate Trigger
                </>
              )}
            </Button>
          </div>

          {/* Results section */}
          {result && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
              {result.matched ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-950">
                          Match Successful!
                        </h4>
                        <p className="text-xs text-emerald-700">
                          Matched keyword: <strong className="font-mono bg-emerald-200/70 px-1.5 py-0.5 rounded text-emerald-900">&quot;{result.matched_keyword}&quot;</strong> on automation <strong className="text-emerald-900">&quot;{result.automation?.name}&quot;</strong>
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-100/60 text-[10px]">
                      ~{result.estimated_execution_time_ms}ms execution
                    </Badge>
                  </div>

                  {/* Actions preview */}
                  <div className="grid gap-2.5 pt-1 text-xs">
                    {/* Public Reply Card */}
                    {result.actions?.public_reply.enabled && (
                      <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
                            Public Comment Reply
                          </span>
                          {result.actions.public_reply.has_rotation && (
                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-[10px] border-0">
                              <Sparkles className="h-2.5 w-2.5 mr-1" />
                              Anti-Spam Rotation Active
                            </Badge>
                          )}
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-slate-700 text-xs font-sans">
                          {result.actions.public_reply.text || "(Empty reply)"}
                        </div>
                        {result.actions.public_reply.has_rotation && (
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400">Spin-tax template active</span>
                            <button
                              type="button"
                              onClick={runSimulation}
                              className="text-[11px] font-medium text-violet-600 hover:text-violet-800 flex items-center gap-1"
                            >
                              <RefreshCw className="h-3 w-3" /> Re-roll variation
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Private DM Preview */}
                    {result.actions?.private_dm.enabled && (
                      <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-emerald-500" />
                            Direct Message (DM) Preview
                          </span>
                          <span className="text-[10px] text-slate-400">Personalized</span>
                        </div>
                        {/* Mock Instagram DM Bubble */}
                        <div className="rounded-2xl rounded-bl-sm bg-gradient-to-tr from-violet-600 to-indigo-600 p-3 text-white text-xs whitespace-pre-wrap leading-relaxed shadow-sm">
                          {result.actions.private_dm.text}
                        </div>
                      </div>
                    )}

                    {/* Auto Actions */}
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 px-1">
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> Auto-like comment: Yes
                      </span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <ShieldCheck className="h-3.5 w-3.5 text-violet-600" /> Deduplicated & Safe
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-950">No Match Found</h4>
                      <p className="text-xs text-amber-700">
                        {result.message || "None of the active automation keywords were found in this comment."}
                      </p>
                    </div>
                  </div>

                  {result.suggestions && result.suggestions.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-semibold text-amber-900 mb-1.5">
                        Active keywords you can test with:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.suggestions.map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => {
                              setCommentText(kw);
                            }}
                            className="text-xs rounded-lg bg-amber-200/70 hover:bg-amber-300 px-2 py-0.5 text-amber-900 font-medium transition-colors"
                          >
                            &quot;{kw}&quot;
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
