"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  Download,
  Zap,
  User,
} from "lucide-react";
import Link from "next/link";

export interface DmEventItem {
  id: string;
  commenter_username: string | null;
  comment_text: string;
  keyword_matched: string | null;
  status: string;
  dm_status: string | null;
  error_message: string | null;
  created_at: string;
  automations: { id: string; name: string; private_message: string | null } | null;
  instagram_accounts: { username: string } | null;
  instagram_media: { caption: string | null; permalink: string | null } | null;
}

export function MessagesFeed({ initialEvents }: { initialEvents: DmEventItem[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");

  const filtered = initialEvents.filter((e) => {
    // Status filter
    const matchesFilter =
      filter === "all" ||
      (filter === "success" && e.dm_status === "success") ||
      (filter === "failed" && (e.dm_status === "failed" || e.status === "failed"));

    // Search query
    const s = search.toLowerCase().trim();
    const matchesSearch =
      !s ||
      (e.commenter_username && e.commenter_username.toLowerCase().includes(s)) ||
      (e.comment_text && e.comment_text.toLowerCase().includes(s)) ||
      (e.keyword_matched && e.keyword_matched.toLowerCase().includes(s)) ||
      (e.automations?.name && e.automations.name.toLowerCase().includes(s)) ||
      (e.automations?.private_message && e.automations.private_message.toLowerCase().includes(s));

    return matchesFilter && matchesSearch;
  });

  const exportCsv = () => {
    const headers = [
      "Timestamp",
      "Recipient Username",
      "Triggering Comment",
      "Matched Keyword",
      "Automation Rule",
      "DM Status",
      "Private Message Copy",
    ];
    const rows = filtered.map((e) => [
      e.created_at,
      e.commenter_username || "",
      `"${(e.comment_text || "").replace(/"/g, '""')}"`,
      e.keyword_matched || "",
      `"${(e.automations?.name || "").replace(/"/g, '""')}"`,
      e.dm_status || "",
      `"${(e.automations?.private_message || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `instaauto-dms-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "all", label: `All DMs (${initialEvents.length})` },
            { id: "success", label: "Delivered Successfully" },
            { id: "failed", label: "Delivery Failed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === tab.id
                  ? "bg-violet-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipient, message, rule..."
              className="pl-8 text-xs h-8 bg-white"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="text-xs h-8 gap-1.5 border-slate-200 shrink-0"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* DM List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((event) => {
            const isSuccess = event.dm_status === "success";
            const dateStr = new Date(event.created_at).toLocaleString();

            return (
              <Card key={event.id} className="hover:shadow-xs transition-shadow border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">
                            Sent to @{event.commenter_username || "user"}
                          </span>
                          {event.instagram_accounts && (
                            <span className="text-xs text-slate-400">
                              from @{event.instagram_accounts.username}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">• {dateStr}</span>
                        </div>

                        {/* Trigger Info */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-500">
                          <span>
                            Triggered by comment:{" "}
                            <strong className="text-slate-800 font-medium">
                              &ldquo;{event.comment_text}&rdquo;
                            </strong>
                          </span>
                          {event.keyword_matched && (
                            <Badge variant="outline" className="text-violet-700 bg-violet-50/70 border-violet-200">
                              Keyword: {event.keyword_matched}
                            </Badge>
                          )}
                          {event.automations && (
                            <span>
                              Rule:{" "}
                              <Link
                                href={`/dashboard/automations/${event.automations.id}`}
                                className="text-violet-600 hover:underline font-medium"
                              >
                                {event.automations.name}
                              </Link>
                            </span>
                          )}
                        </div>

                        {/* Private Message Copy Preview */}
                        {event.automations?.private_message && (
                          <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-700 whitespace-pre-wrap font-sans max-w-xl">
                            {event.automations.private_message}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery Status */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={isSuccess ? "success" : "destructive"}>
                        {isSuccess ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Delivered
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </Badge>
                      {event.error_message && (
                        <p className="text-[11px] text-rose-500 max-w-[180px] text-right truncate">
                          {event.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 mb-3">
              <Mail className="h-6 w-6 text-violet-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {search || filter !== "all" ? "No DMs matching criteria" : "No direct messages dispatched yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              {search || filter !== "all"
                ? "Try clearing your search query or switching filters to see all messages."
                : "When users comment matching keywords on your connected Instagram posts, private DMs will be dispatched and logged here."}
            </p>
            {search || filter !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href="/dashboard/automations/new">Setup New DM Automation</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
