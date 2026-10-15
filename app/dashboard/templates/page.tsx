"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  FileText, Copy, Check, ArrowRight, Sparkles, ShoppingBag,
  Gift, Download, Headphones, Video
} from "lucide-react";

interface Template {
  id: string;
  category: "ecommerce" | "leads" | "giveaway" | "support";
  title: string;
  description: string;
  icon: any;
  publicReply: string;
  privateMessage: string;
  suggestedKeywords: string[];
}

const TEMPLATES: Template[] = [
  {
    id: "product_link",
    category: "ecommerce",
    title: "Product Purchase & Price Drop",
    description: "Send direct checkout link and product pricing when users comment on products or posters.",
    icon: ShoppingBag,
    suggestedKeywords: ["price", "cost", "buy", "order", "link"],
    publicReply: "Sent you the direct link and price in your DM! Check your inbox ❤️",
    privateMessage: "Hey {{first_name}} 👋\n\nThanks for asking! Here are the details for {{product_name}}:\n\n💰 Price: {{product_price}}\n🔗 Order link: {{product_url}}\n\nLet me know if you need any help picking a size!",
  },
  {
    id: "discount_code",
    category: "ecommerce",
    title: "Exclusive Discount & Promo Code",
    description: "Incentivize commenters with a special 15% or 20% discount code directly in DMs.",
    icon: Gift,
    suggestedKeywords: ["discount", "coupon", "deal", "promo", "save"],
    publicReply: "Check your DMs for your exclusive discount code! 🎁✨",
    privateMessage: "Hi {{first_name}}! 🎉\n\nHere is your private 15% discount code: INSTA15\n\nUse it on any product here: {{product_url}}\n\nValid for the next 24 hours only. Enjoy shopping!",
  },
  {
    id: "free_guide",
    category: "leads",
    title: "Free Guide / Lead Magnet Download",
    description: "Grow your email list or deliver downloadable assets when users comment on your educational Reels.",
    icon: Download,
    suggestedKeywords: ["guide", "free", "pdf", "checklist", "ebook"],
    publicReply: "Sent the free guide to your DM! Enjoy reading 📚",
    privateMessage: "Hey {{first_name}}! 🚀\n\nHere is your instant access to the guide you requested:\n\n📥 Download link: {{product_url}}\n\nFeel free to reply right here if you have any questions after going through it!",
  },
  {
    id: "reel_giveaway",
    category: "giveaway",
    title: "Reel Giveaway & Contest Entry",
    description: "Automate entries for viral Instagram giveaways and confirm entry via DM.",
    icon: Video,
    suggestedKeywords: ["win", "enter", "giveaway", "contest", "yes"],
    publicReply: "You're in! Check your DMs for entry confirmation and bonus entries 🎟️",
    privateMessage: "Woohoo {{first_name}}! 🥳\n\nYour entry is officially confirmed for our giveaway!\n\nWant 3 bonus entries? Share this Reel to your Instagram story and tag us!\n\nWinners announced this Sunday at 6 PM. Good luck! 🍀",
  },
  {
    id: "vip_support",
    category: "support",
    title: "VIP Customer Support & Inquiries",
    description: "Quickly assist commenters who ask about shipping, returns, or order status.",
    icon: Headphones,
    suggestedKeywords: ["help", "track", "shipping", "return", "support"],
    publicReply: "Hey! We've messaged you in DMs so we can help resolve this right away 🙏",
    privateMessage: "Hi {{first_name}}, thanks for reaching out!\n\nWe want to make sure you're completely taken care of. Could you share your order number or question here? Our team is on standby to help you!",
  },
];

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTemplates = TEMPLATES.filter(
    t => selectedCategory === "all" || t.category === selectedCategory
  );

  const copyTemplate = (template: Template) => {
    const text = `Public Reply:\n${template.publicReply}\n\nPrivate Message (DM):\n${template.privateMessage}`;
    navigator.clipboard.writeText(text);
    setCopiedId(template.id);
    toast({ variant: "success", title: "Template copied to clipboard!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Message & Reply Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">High-converting pre-built templates for comment replies and DMs</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/dashboard/automations/new">
            <Sparkles className="h-4 w-4 mr-1.5" /> Create Automation
          </Link>
        </Button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: "all", label: "All Templates" },
          { id: "ecommerce", label: "E-Commerce & Sales" },
          { id: "leads", label: "Lead Magnets & Freebies" },
          { id: "giveaway", label: "Giveaways & Viral Contests" },
          { id: "support", label: "Customer Support" },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedCategory === cat.id
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredTemplates.map(template => {
          const IconComponent = template.icon;
          const isCopied = copiedId === template.id;

          return (
            <Card key={template.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-slate-900">{template.title}</CardTitle>
                      <CardDescription className="text-xs">{template.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {/* Suggested keywords */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-medium text-slate-400">Triggers:</span>
                  {template.suggestedKeywords.map(kw => (
                    <span key={kw} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {kw}
                    </span>
                  ))}
                </div>

                {/* Public Reply Preview */}
                <div className="rounded-xl bg-slate-50 p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Public Reply</span>
                  <p className="text-xs text-slate-700">{template.publicReply}</p>
                </div>

                {/* DM Message Preview */}
                <div className="rounded-xl bg-violet-50/60 border border-violet-100 p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-violet-500">Private Message (DM)</span>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap">{template.privateMessage}</p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyTemplate(template)}
                    className="flex-1 gap-1.5 text-xs"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {isCopied ? "Copied!" : "Copy Template"}
                  </Button>
                  <Button size="sm" asChild className="flex-1 gap-1.5 text-xs">
                    <Link href={`/dashboard/automations/new?template=${template.id}`}>
                      Use in Automation <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
