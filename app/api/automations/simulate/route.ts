import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { matchesAnyKeyword, interpolateTemplate, buildMessageVariables, resolveRotatingReply } from "@/lib/automation/matcher";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rawMember } = await (supabase
      .from("workspace_members") as any)
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const member = rawMember as { workspace_id: string } | null;

    if (!member?.workspace_id) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      comment_text,
      commenter_username = "alex_creator",
      automation_id,
    } = body;

    if (!comment_text || typeof comment_text !== "string") {
      return NextResponse.json({ error: "comment_text is required" }, { status: 400 });
    }

    // Fetch automations for this workspace
    let query = (supabase
      .from("automations") as any)
      .select(`
        id,
        name,
        status,
        public_reply,
        private_message,
        dm_enabled,
        public_reply_enabled,
        reply_to_all,
        instagram_media_id,
        automation_keywords(keyword),
        products(id, name, price, url, currency),
        instagram_accounts(id, username)
      `)
      .eq("workspace_id", member.workspace_id);

    if (automation_id) {
      query = query.eq("id", automation_id);
    } else {
      query = query.eq("status", "active");
    }

    const { data: automations, error: autoError } = await query;

    if (autoError) {
      return NextResponse.json({ error: autoError.message }, { status: 500 });
    }

    if (!automations || automations.length === 0) {
      return NextResponse.json({
        matched: false,
        message: automation_id
          ? "Selected automation not found"
          : "No active automations found in your workspace",
      });
    }

    // Test each automation against the comment text
    for (const auto of automations as any[]) {
      const keywords = (auto.automation_keywords || []).map((k: any) => k.keyword);
      const matchedKeyword = matchesAnyKeyword(comment_text, keywords);

      if (matchedKeyword) {
        const product = auto.products;
        const currencySymbol = product?.currency === "INR" ? "₹" : "$";
        const formattedPrice = product?.price ? `${currencySymbol}${product.price}` : "";

        const vars = buildMessageVariables({
          username: commenter_username,
          firstName: commenter_username.split("_")[0] || commenter_username,
          productName: product?.name,
          productPrice: formattedPrice,
          productUrl: product?.url || "",
        });

        const rawPublicReply = auto.public_reply || "";
        const simulatedPublicReply = auto.public_reply_enabled
          ? resolveRotatingReply(rawPublicReply)
          : null;

        const rawPrivateMessage = auto.private_message || "";
        const simulatedDm = auto.dm_enabled
          ? interpolateTemplate(rawPrivateMessage, vars)
          : null;

        return NextResponse.json({
          matched: true,
          automation: {
            id: auto.id,
            name: auto.name,
            account_username: auto.instagram_accounts?.username || null,
          },
          matched_keyword: matchedKeyword,
          comment_analyzed: comment_text,
          commenter: commenter_username,
          actions: {
            auto_like_comment: true,
            auto_like_media: true,
            public_reply: {
              enabled: auto.public_reply_enabled,
              text: simulatedPublicReply,
              has_rotation: rawPublicReply.includes("{") || rawPublicReply.includes("\n"),
              original_template: rawPublicReply,
            },
            private_dm: {
              enabled: auto.dm_enabled,
              text: simulatedDm,
              interpolated_vars: vars,
              original_template: rawPrivateMessage,
            },
          },
          estimated_execution_time_ms: 380,
        });
      }
    }

    // No keyword matched
    return NextResponse.json({
      matched: false,
      message: `No active automation keywords matched "${comment_text}".`,
      tested_automations_count: automations.length,
      suggestions: automations.flatMap((a: any) =>
        (a.automation_keywords || []).map((k: any) => k.keyword)
      ).slice(0, 8),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Simulation failed" },
      { status: 500 }
    );
  }
}
