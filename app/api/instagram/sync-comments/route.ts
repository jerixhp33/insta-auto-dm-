import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { checkAndMarkProcessed } from "@/lib/automation/idempotency";
import { matchesAnyKeyword, interpolateTemplate, buildMessageVariables } from "@/lib/automation/matcher";
import { sendInstagramPublicReply, sendInstagramPrivateReply } from "@/lib/instagram/client";

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  const supabase = await createServiceClient();

  // 1. Get all connected Instagram accounts
  const { data: accounts } = await (supabase
    .from("instagram_accounts") as any)
    .select("id, workspace_id, encrypted_access_token, instagram_user_id, username")
    .eq("status", "connected");

  if (!accounts?.length) {
    return NextResponse.json({ message: "No connected accounts found" }, { status: 200 });
  }

  const results: any[] = [];

  for (const account of accounts) {
    let accessToken: string;
    try {
      accessToken = decrypt(account.encrypted_access_token);
    } catch {
      continue;
    }

    // 2. Get active automations for this account
    const { data: automations } = await (supabase
      .from("automations") as any)
      .select("id, name, public_reply, private_message, product_id, dm_enabled, public_reply_enabled, trigger_count, success_count, reply_to_all, instagram_media_id, automation_keywords(keyword), products(name, price, url, currency)")
      .eq("workspace_id", account.workspace_id)
      .eq("instagram_account_id", account.id)
      .eq("status", "active");

    if (!automations?.length) continue;

    // 3. Fetch recent media for this account
    let mediaList: any[] = [];
    try {
      const mediaRes = await fetch(`https://graph.instagram.com/v19.0/me/media?fields=id,caption,permalink&limit=10&access_token=${accessToken}`);
      const mediaData = await mediaRes.json();
      mediaList = mediaData?.data || [];
    } catch (e) {
      console.warn("[Sync] Error fetching media:", e);
    }

    for (const media of mediaList) {
      let comments: any[] = [];
      try {
        const cRes = await fetch(`https://graph.instagram.com/v19.0/${media.id}/comments?fields=id,text,username,timestamp,from&access_token=${accessToken}`);
        const cData = await cRes.json();
        comments = cData?.data || [];
      } catch {}

      for (const comment of comments) {
        const commentId = comment.id;
        const commentText = comment.text;
        const commenterUsername = comment.username || comment.from?.username;
        const commenterId = comment.from?.id;

        if (!commentId || !commentText) continue;

        // Skip if already processed
        const isNew = await checkAndMarkProcessed(`comment:${commentId}`, account.workspace_id);
        if (!isNew) continue;

        // Match against automations
        for (const auto of automations) {
          const isScoped = !auto.reply_to_all && !!auto.instagram_media_id;
          // Scoping check if not reply_to_all
          if (isScoped && auto.instagram_media_id !== media.id) continue;

          const keywords = (auto.automation_keywords || []).map((k: any) => k.keyword);
          const matched = matchesAnyKeyword(commentText, keywords);
          if (!matched) continue;

          console.log(`[Sync Worker] Found unprocessed comment "${commentText}" on media ${media.id}! Triggering automation "${auto.name}"`);

          const isSelf = commenterUsername === account.username;

          // Dispatch Public Reply and DM concurrently
          const tasks: Promise<boolean>[] = [];

          if (auto.public_reply_enabled && auto.public_reply) {
            tasks.push(
              sendInstagramPublicReply(accessToken, commentId, auto.public_reply)
                .then(() => true)
                .catch(() => false)
            );
          } else {
            tasks.push(Promise.resolve(false));
          }

          if (auto.dm_enabled && auto.private_message && !isSelf) {
            const vars = buildMessageVariables({
              firstName: commenterUsername?.split("_")[0] || commenterUsername,
              username: commenterUsername,
              productName: auto.products?.name,
              productPrice: auto.products?.price ? `${auto.products.currency === "INR" ? "₹" : "$"}${auto.products.price}` : undefined,
              productUrl: auto.products?.url || undefined,
            });
            const dm = interpolateTemplate(auto.private_message, vars);
            tasks.push(
              sendInstagramPrivateReply(accessToken, account.instagram_user_id, commentId, dm, commenterId)
                .then(() => true)
                .catch(() => false)
            );
          } else {
            tasks.push(Promise.resolve(false));
          }

          const [pubOk, dmOk] = await Promise.all(tasks);

          // Save event
          await (supabase.from("automation_events") as any).insert({
            workspace_id: account.workspace_id,
            automation_id: auto.id,
            instagram_account_id: account.id,
            commenter_ig_id: commenterId || null,
            commenter_username: commenterUsername || null,
            comment_text: commentText,
            comment_ig_id: commentId,
            keyword_matched: matched,
            status: pubOk || dmOk ? "success" : "failed",
            public_reply_status: auto.public_reply_enabled ? (pubOk ? "success" : "failed") : null,
            dm_status: auto.dm_enabled ? (isSelf ? "skipped_self" : (dmOk ? "success" : "failed")) : null,
            processed_at: new Date().toISOString(),
          }).catch(() => null);

          results.push({ commentId, commenterUsername, text: commentText, reply: pubOk, dm: dmOk });
          break;
        }
      }
    }
  }

  return NextResponse.json({ success: true, processed: results.length, details: results });
}
