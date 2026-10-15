"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Zap,
  Server,
  Layers,
  Sparkles,
} from "lucide-react";

interface CheckItem {
  name: string;
  status: "pass" | "warn" | "fail" | "idle";
  detail: string;
}

interface AccountDiag {
  id: string;
  username: string;
  token_valid: boolean;
  token_error: string | null;
  account_type: string;
  can_read_media: boolean;
  sample_media_detected: number;
  latency_ms: number;
}

interface HealthData {
  status: "healthy" | "action_required" | "ready_to_connect";
  timestamp: string;
  duration_ms: number;
  accounts: AccountDiag[];
  metrics: {
    total_accounts: number;
    active_automations: number;
    total_events_processed: number;
  };
  checks: CheckItem[];
}

export function SystemHealthCard() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/instagram/health");
      const json = await res.json();
      if (!json.error) {
        setData(json);
      }
    } catch (err) {
      console.warn("Failed to fetch system diagnostics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <Card className="border-slate-200 overflow-hidden shadow-xs">
      <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900">
                  Engine Health & Live Diagnostics
                </CardTitle>
                {data && (
                  <Badge
                    variant="outline"
                    className={
                      data.status === "healthy"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : data.status === "ready_to_connect"
                        ? "border-slate-200 bg-slate-100 text-slate-600"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }
                  >
                    {data.status === "healthy" ? (
                      <span className="flex items-center gap-1 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        All Systems Operational
                      </span>
                    ) : data.status === "ready_to_connect" ? (
                      "Ready to Connect"
                    ) : (
                      "Action Needed"
                    )}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Real-time validation of Meta tokens, comment poller, idempotency, and anti-spam systems.
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
            disabled={loading}
            className="text-xs gap-1.5 h-8 font-medium border-slate-200 hover:bg-slate-100 self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Run Self-Test
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {loading && !data ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-violet-600" />
            <p className="text-xs font-medium">Verifying Meta Graph API connectivity...</p>
          </div>
        ) : data ? (
          <>
            {/* Account Status */}
            {data.accounts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Connected Instagram Accounts & Tokens
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            @{acc.username}
                          </p>
                          <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0">
                            {acc.account_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {acc.token_valid ? (
                            <span className="text-emerald-600 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="h-3 w-3 inline" /> Meta token active (~{acc.latency_ms}ms)
                            </span>
                          ) : (
                            <span className="text-rose-600 flex items-center gap-1 font-medium">
                              <XCircle className="h-3 w-3 inline" /> {acc.token_error || "Token invalid"}
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge
                        variant={acc.token_valid ? "success" : "destructive"}
                        className="text-[11px] shrink-0"
                      >
                        {acc.token_valid ? "Verified" : "Reconnect"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Core Diagnostic Checklist */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Autonomous Architecture Validation
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.checks.map((chk) => {
                  const isPass = chk.status === "pass";
                  return (
                    <div
                      key={chk.name}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 flex items-start gap-2.5"
                    >
                      {isPass ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : chk.status === "idle" ? (
                        <Server className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900">{chk.name}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {chk.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-violet-500" />
                Active Automations: <strong className="text-slate-800">{data.metrics.active_automations}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-500" />
                Total Processed Events: <strong className="text-slate-800">{data.metrics.total_events_processed}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                Engine Speed: <strong className="text-slate-800">~{data.duration_ms}ms response</strong>
              </span>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-xs text-slate-400">
            Click &quot;Run Self-Test&quot; to test your Instagram connection and automation engine.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
