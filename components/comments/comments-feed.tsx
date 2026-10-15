"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  Heart,
  ExternalLink,
  Search,
  Download,
  Mail,
  Zap,
} from "lucide-react";
import Link from "next/link";

export interface CommentEventItem {
  id: string;
  commenter_username: string | null;
  comment_text: string;
  keyword_matched: string | null;
  status: string;
  public_reply_status: string | null;
  dm_status: string | null;
  error_message: string | null;
  created_at: string;
  automations: { id: string; name: string } | null;
  instagram_accounts: { username: string } | null;
  instagram_media: { caption: string | null; permalink: string | null; media_type: string } | null;
}

export function CommentsFeed({ initialEvents }: { initialEvents: CommentEventItem[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "replied" | "dm_sent" | "failed">("all");

  const filtered = initialEvents.filter((e) => {
    // Status filter
    const matchesFilter =
      filter === "all" ||
      (filter === "replied" && (e.public_reply_status === "success" || e.status === "success")) ||
      (filter === "dm_sent" && e.dm_status === "success") ||
      (filter === "failed" && (e.status === "failed" || e.public_reply_status === "failed" || e.dm_status === "failed"));

    // Search query
    const s = search.toLowerCase().trim();
    const matchesSearch =
      !s ||
      (e.commenter_username && e.commenter_username.toLowerCase().includes(s)) ||
      (e.comment_text && e.comment_text.toLowerCase().includes(s)) ||
      (e.keyword_matched && e.keyword_matched.toLowerCase().includes(s)) ||
      (e.automations?.name && e.automations.name.toLowerCase().includes(s));

    return matchesFilter && matchesSearch;
  });

  const exportCsv = () => {
    const headers = [
      "Timestamp",
      "Commenter",
      "Comment Text",
      "Matched Keyword",
      "Automation Rule",
      "Public Reply Status",
      "DM Status",
      "Overall Status",
    ];
    const rows = filtered.map((e) => [
      e.created_at,
      e.commenter_username || "",
      `"${(e.comment_text || "").replace(/"/g, '""')}"`,
      e.keyword_matched || "",
      `"${(e.automations?.name || "").replace(/"/g, '""')}"`,
      e.public_reply_status || "",
      e.dm_status || "",
      e.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `instaauto-comments-${new Date().toISOString().slice(0, 10)}.csv`);
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
            { id: "all", label: `All (${initialEvents.length})` },
            { id: "replied", label: "Public Replied" },
            { id: "dm_sent", label: "DMs Sent" },
            { id: "failed", label: "Needs Attention" },
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
              placeholder="Search comments, @user, rule..."
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

      {/* Comment Activity Feed */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((event) => {
            const dateStr = new Date(event.created_at).toLocaleString();

            return (
              <Card key={event.id} className="hover:shadow-xs transition-shadow border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {event.commenter_username ? event.commenter_username[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">
                            @{event.commenter_username || "anonymous_user"}
                          </span>
                          {event.instagram_accounts && (
                            <span className="text-xs text-slate-400">
                              on @{event.instagram_accounts.username}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">• {dateStr}</span>
                        </div>

                        <p className="text-sm text-slate-800 mt-1 font-medium bg-slate-50 rounded-lg px-2.5 py-1.5 inline-block border border-slate-100">
                          &ldquo;{event.comment_text}&rdquo;
                        </p>

                        <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                          {event.keyword_matched && (
                            <Badge variant="outline" className="text-violet-700 bg-violet-50/70 border-violet-200">
                              Keyword: {event.keyword_matched}
                            </Badge>
                          )}
                          {event.automations && (
                            <span className="text-slate-500">
                              Rule:{" "}
                              <Link
                                href={`/dashboard/automations/${event.automations.id}`}
                                className="text-violet-600 hover:underline font-medium"
                              >
                                {event.automations.name}
                              </Link>
                            </span>
                          )}
                          {event.instagram_media?.permalink && (
                            <a
                              href={event.instagram_media.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-700 inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" /> View Reel/Post
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">Auto-Like:</span>
                          <span className="inline-flex items-center gap-0.5 text-xs text-pink-600 font-medium">
                            <Heart className="h-3 w-3 fill-pink-500 text-pink-500" /> Done
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">Public Reply:</span>
                          <Badge
                            variant={
                              event.public_reply_status === "success"
                                ? "success"
                                : event.public_reply_status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {event.public_reply_status || "Pending"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">Private DM:</span>
                          <Badge
                            variant={
                              event.dm_status === "success"
                                ? "success"
                                : event.dm_status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {event.dm_status || "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {event.error_message && (
                    <div className="mt-3 p-2 bg-red-50 rounded-lg text-xs text-red-600 border border-red-100">
                      Error: {event.error_message}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 mb-3">
              <MessageCircle className="h-6 w-6 text-violet-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {search || filter !== "all" ? "No comments matching criteria" : "No comment activity yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              {search || filter !== "all"
                ? "Try clearing your search query or switching filters to see all comments."
                : "When users comment on your Instagram Reels or Posts matching your trigger keywords, they will appear here with live tracking."}
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
                <Link href="/dashboard/automations/new">Create Your First Automation</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
