"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle, CheckCircle, XCircle, Zap, Mail,
  Search, Download, RefreshCw, Filter
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface EventRow {
  id: string;
  status: string;
  comment_text: string;
  commenter_username: string | null;
  keyword_matched: string | null;
  public_reply_status: string | null;
  dm_status: string | null;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  automations: { name: string } | null;
}

const statusBadge: Record<string, { variant: "success" | "destructive" | "secondary" | "default" | "warning" | "outline"; label: string }> = {
  success: { variant: "success", label: "Success" },
  failed: { variant: "destructive", label: "Failed" },
  pending: { variant: "secondary", label: "Pending" },
  processing: { variant: "default", label: "Processing" },
  retrying: { variant: "secondary", label: "Retrying" },
};

export function ActivityFeed({ initialEvents }: { initialEvents: EventRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = initialEvents.filter(e => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "success" && (e.status === "success" || e.public_reply_status === "success")) ||
      (statusFilter === "failed" && (e.status === "failed" || e.public_reply_status === "failed" || e.dm_status === "failed"));

    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      (e.commenter_username && e.commenter_username.toLowerCase().includes(s)) ||
      (e.comment_text && e.comment_text.toLowerCase().includes(s)) ||
      (e.keyword_matched && e.keyword_matched.toLowerCase().includes(s)) ||
      (e.automations?.name && e.automations.name.toLowerCase().includes(s));

    return matchesStatus && matchesSearch;
  });

  const exportCsv = () => {
    const headers = ["Timestamp", "Commenter", "Comment Text", "Keyword", "Public Reply", "DM Status", "Overall Status"];
    const rows = filtered.map(e => [
      e.created_at,
      e.commenter_username || "",
      `"${(e.comment_text || "").replace(/"/g, '""')}"`,
      e.keyword_matched || "",
      e.public_reply_status || "",
      e.dm_status || "",
      e.status,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `instaauto-activity-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: "all", label: "All Activity" },
            { id: "success", label: "Delivered & Replied" },
            { id: "failed", label: "Failed / Attention" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab.id
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
              type="text"
              placeholder="Search user or comment..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8.5 h-8.5 text-xs bg-white"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="h-8.5 gap-1.5 text-xs font-medium"
            title="Download CSV report"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Events List */}
      {filtered.length ? (
        <div className="space-y-3">
          {filtered.map(event => {
            const automation = event.automations;
            const status = statusBadge[event.status] || statusBadge.pending;

            return (
              <Card key={event.id} className="hover:shadow-xs transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        event.status === "success"
                          ? "bg-emerald-50 text-emerald-600"
                          : event.status === "failed"
                          ? "bg-red-50 text-red-600"
                          : "bg-violet-50 text-violet-600"
                      }`}
                    >
                      {event.status === "success" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : event.status === "failed" ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <MessageCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-900">
                          @{event.commenter_username || "unknown"}
                        </span>
                        {event.keyword_matched && (
                          <Badge variant="outline" className="text-[10px] text-violet-700 bg-violet-50 font-medium">
                            keyword: {event.keyword_matched}
                          </Badge>
                        )}
                        <Badge variant={status.variant} className="text-[10px] py-0">
                          {status.label}
                        </Badge>
                      </div>

                      <p className="text-sm text-slate-700 mb-2 line-clamp-2">
                        &ldquo;{event.comment_text}&rdquo;
                      </p>

                      <div className="flex flex-wrap gap-3 mb-2">
                        {event.public_reply_status && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
                            <span>Reply:</span>
                            <span
                              className={
                                event.public_reply_status === "success"
                                  ? "text-emerald-600 font-semibold"
                                  : "text-red-600 font-semibold"
                              }
                            >
                              {event.public_reply_status}
                            </span>
                          </div>
                        )}
                        {event.dm_status && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="h-3.5 w-3.5 text-violet-500" />
                            <span>DM:</span>
                            <span
                              className={
                                event.dm_status === "success"
                                  ? "text-emerald-600 font-semibold"
                                  : "text-red-600 font-semibold"
                              }
                            >
                              {event.dm_status}
                            </span>
                          </div>
                        )}
                        {event.retry_count > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600">
                            <Zap className="h-3.5 w-3.5" />
                            Retried {event.retry_count}×
                          </div>
                        )}
                      </div>

                      {event.error_message && (
                        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1 mb-2 font-mono">
                          {event.error_message}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {automation && (
                          <span className="flex items-center gap-1 font-medium text-slate-500">
                            <Zap className="h-3 w-3 text-violet-500" />
                            {automation.name}
                          </span>
                        )}
                        <span>{formatDate(event.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <MessageCircle className="h-10 w-10 text-slate-200 mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">No matching activity found</h3>
            <p className="text-sm text-slate-400">
              {search || statusFilter !== "all"
                ? "Try clearing filters to see more results."
                : "Activity will appear here once your automations fire."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
