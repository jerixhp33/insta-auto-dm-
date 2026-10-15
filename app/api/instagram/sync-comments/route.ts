import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { checkAndMarkProcessed } from "@/lib/automation/idempotency";
import { matchesAnyKeyword, interpolateTemplate, buildMessageVariables } from "@/lib/automation/matcher";
import { sendInstagramPublicReply, sendInstagramPrivateReply, likeInstagramComment } from "@/lib/instagram/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow full minute for sync on Vercel

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  try {
    const supabase = await createServiceClient();

    // 1. Get all connected Instagram accounts
    const { data: accounts, error: accErr } = await (supabase
      .from("instagram_accounts") as any)
      .select("id, workspace_id, encrypted_access_token, instagram_user_id, username")
      .eq("status", "connected");

    if (accErr) {
      return NextResponse.json({ error: accErr.message }, { status: 500 });
    }

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

      // 2. Get active automations for this account with media and product links
      const { data: automations } = await (supabase
        .from("automations") as any)
        .select(`
          id, name, public_reply, private_message, product_id, dm_enabled, 
          public_reply_enabled, trigger_count, success_count, reply_to_all, 
          instagram_media_id,
          automation_keywords(keyword), 
          products(name, price, url, currency),
          instagram_media(id, instagram_media_id)
        `)
        .eq("workspace_id", account.workspace_id)
        .eq("instagram_account_id", account.id)
        .eq("status", "active");

      if (!automations?.length) continue;

      // 3. Fetch recent media for this account
      let mediaList: any[] = [];
      try {
        const mediaRes = await fetch(
          `https://graph.instagram.com/v19.0/me/media?fields=id,caption,permalink&limit=25&access_token=${accessToken}`
        );
        const mediaData = await mediaRes.json();
        mediaList = mediaData?.data || [];
      } catch (e) {
        console.warn("[Sync] Error fetching media:", e);
      }

      for (const media of mediaList) {
        let comments: any[] = [];
        try {
          const cRes = await fetch(
            `https://graph.instagram.com/v19.0/${media.id}/comments?fields=id,text,username,timestamp,from{id,username}&access_token=${accessToken}`
          );
          const cData = await cRes.json();
          comments = cData?.data || [];
        } catch {}

        for (const comment of comments) {
          const commentId = comment.id;
          const commentText = comment.text;
          const commenterUsername = comment.from?.username || comment.username;
          const commenterId = comment.from?.id;

          if (!commentId || !commentText) continue;

          // Never trigger on the account's own comments or bot replies
          const isSelf =
            (commenterUsername &&
              account.username &&
              commenterUsername.toLowerCase() === account.username.toLowerCase()) ||
            commenterId === account.instagram_user_id;

          if (isSelf) continue;

          // Skip if already processed atomically
          const isNew = await checkAndMarkProcessed(`comment:${commentId}`, account.workspace_id);
          if (!isNew) continue;

          // Match against automations
          for (const auto of automations) {
            const targetMediaIgId = auto.instagram_media?.instagram_media_id;
            const isScoped = !auto.reply_to_all && (!!auto.instagram_media_id || !!targetMediaIgId);

            if (isScoped) {
              const matchesTarget =
                auto.instagram_media_id === media.id ||
                targetMediaIgId === media.id;
              if (!matchesTarget) continue;
            }

            const keywords = (auto.automation_keywords || []).map((k: any) => k.keyword);
            const matched = matchesAnyKeyword(commentText, keywords);
            if (!matched) continue;

            console.log(
              `[Sync Engine] Active match! comment "${commentText}" on media ${media.id} triggered "${auto.name}"`
            );

            // Like comment silently in background
            likeInstagramComment(accessToken, commentId, account.instagram_user_id).catch(() => null);

            // Dispatch Public Reply and DM concurrently
            const tasks: Promise<boolean>[] = [];

            if (auto.public_reply_enabled && auto.public_reply) {
              tasks.push(
                sendInstagramPublicReply(accessToken, commentId, auto.public_reply)
                  .then(() => true)
                  .catch((err) => {
                    console.warn(`[Sync Engine] Public reply error:`, err?.message || err);
                    return false;
                  })
              );
            } else {
              tasks.push(Promise.resolve(false));
            }

            if (auto.dm_enabled && auto.private_message && !isSelf) {
              const vars = buildMessageVariables({
                firstName: commenterUsername
                  ? commenterUsername.split("_")[0] || commenterUsername
                  : "there",
                username: commenterUsername || "",
                productName: auto.products?.name,
                productPrice: auto.products?.price
                  ? `${auto.products.currency === "INR" ? "₹" : "$"}${auto.products.price}`
                  : undefined,
                productUrl: auto.products?.url || undefined,
              });
              const dm = interpolateTemplate(auto.private_message, vars);
              tasks.push(
                sendInstagramPrivateReply(
                  accessToken,
                  account.instagram_user_id,
                  commentId,
                  dm,
                  commenterId
                )
                  .then(() => true)
                  .catch((err) => {
                    console.warn(`[Sync Engine] DM error:`, err?.message || err);
                    return false;
                  })
              );
            } else {
              tasks.push(Promise.resolve(false));
            }

            const [pubOk, dmOk] = await Promise.all(tasks);

            // Record event safely in database
            try {
              await (supabase.from("automation_events") as any).insert({
                workspace_id: account.workspace_id,
                automation_id: auto.id,
                instagram_account_id: account.id,
                instagram_media_id: auto.instagram_media_id || null,
                commenter_ig_id: commenterId || null,
                commenter_username: commenterUsername || null,
                comment_text: commentText,
                comment_ig_id: commentId,
                keyword_matched: matched,
                status: pubOk || dmOk ? "success" : "failed",
                public_reply_status: auto.public_reply_enabled
                  ? pubOk
                    ? "success"
                    : "failed"
                  : null,
                dm_status: auto.dm_enabled
                  ? isSelf
                    ? "skipped_self"
                    : dmOk
                    ? "success"
                    : "failed"
                  : null,
                processed_at: new Date().toISOString(),
              });
            } catch (eventErr: any) {
              console.warn("[Sync Engine] Error inserting automation_event:", eventErr?.message || eventErr);
            }

            // Update automation stats
            try {
              await (supabase.from("automations") as any)
                .update({
                  trigger_count: (auto.trigger_count || 0) + 1,
                  success_count: (auto.success_count || 0) + (pubOk || dmOk ? 1 : 0),
                  last_triggered_at: new Date().toISOString(),
                })
                .eq("id", auto.id);
            } catch (statErr: any) {
              console.warn("[Sync Engine] Error updating automation stats:", statErr?.message || statErr);
            }

            results.push({
              commentId,
              commenterUsername,
              text: commentText,
              reply: pubOk,
              dm: dmOk,
            });
            break;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      details: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Sync Engine Error]:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Internal error during sync" },
      { status: 500 }
    );
  }
}
