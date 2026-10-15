/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateWebhookSignature } from "@/lib/security/webhook";
import { checkAndMarkProcessed } from "@/lib/automation/idempotency";
import { matchesAnyKeyword, interpolateTemplate, buildMessageVariables } from "@/lib/automation/matcher";
import { decrypt } from "@/lib/encryption";
import { withRetry } from "@/lib/automation/retry";
import {
  InstagramApiError,
  likeInstagramComment,
  likeInstagramMedia,
  sendInstagramPublicReply,
  sendInstagramPrivateReply,
} from "@/lib/instagram/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  let rawBody: string;
  try { rawBody = await request.text(); }
  catch { return NextResponse.json({ error: "Could not read body" }, { status: 400 }); }

  const signature = request.headers.get("x-hub-signature-256");
  const isValid = validateWebhookSignature(rawBody, signature);

  const supabase = await createServiceClient();

  // Log raw incoming request to activity_logs
  await (supabase.from("activity_logs") as any).insert({
    workspace_id: "1da6df79-6133-4dd2-9312-00df190dc820",
    action: isValid ? "webhook_received" : "webhook_signature_failed",
    metadata: {
      signature,
      isValid,
      body: rawBody.slice(0, 1000),
    },
  }).catch(() => null);

  if (!isValid) {
    console.warn("[Webhook] Invalid signature:", signature);
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let payload: WebhookPayload;
  try { payload = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  try {
    await processWebhookAsync(payload);
  } catch (err: any) {
    console.error("[Webhook] Processing Error:", err?.message || err);
  }
  return NextResponse.json({ received: true }, { status: 200 });
}

interface WebhookPayload {
  object: string;
  entry: {
    id: string;
    changes: {
      value: {
        media_id?: string;
        media?: { id: string };
        comment_id?: string;
        from?: { id: string; username?: string };
        text?: string;
        id?: string;
        parent_id?: string;
      };
      field: string;
    }[];
  }[];
}
interface AccountRow { id: string; workspace_id: string; encrypted_access_token: string; status: string; username: string; instagram_user_id?: string; }
interface MediaRow { id: string; }
interface AutomationRow {
  id: string; name: string; public_reply: string | null; private_message: string | null; product_id: string | null;
  dm_enabled: boolean; public_reply_enabled: boolean; trigger_count: number; success_count: number; failure_count: number;
  reply_to_all?: boolean; instagram_media_id?: string | null;
  automation_keywords: { keyword: string }[];
  products: { name: string; price: number | null; url: string | null; currency: string } | null;
}
interface AutomationScopedRow { instagram_media_id: string | null; reply_to_all?: boolean; }
interface EventRow { id: string; }

async function processWebhookAsync(payload: WebhookPayload) {
  if (payload.object !== "instagram" && payload.object !== "page") return;
  const supabase = await createServiceClient();

  for (const entry of payload.entry || []) {
    const igUserId = entry.id;
    for (const change of entry.changes || []) {
      if (change.field !== "comments" && change.field !== "feed") continue;
      const { value } = change;
      const commentId = value.id || value.comment_id || (value as any).post_id;
      const mediaId = value.media?.id || value.media_id;
      const commentText = value.text || (value as any).message;
      const commenterId = value.from?.id;
      const commenterUsername = value.from?.username;
      const parentId = value.parent_id || (value as any).parent_id;
      if (!commentId || !commentText) continue;

      // Ignore sub-replies to prevent recursive loops with the bot
      if (parentId) {
        console.log(`[Webhook] Skipping sub-reply to parent ${parentId}`);
        continue;
      }

      console.log(`[Webhook] Incoming comment for IG user ${igUserId}: "${commentText}" from @${commenterUsername || commenterId} on comment ${commentId}, media ${mediaId}`);

      // 1. Resolve connected Instagram account
      let { data: rawAccount } = await (supabase
        .from("instagram_accounts") as any)
        .select("id, workspace_id, encrypted_access_token, status, username, instagram_user_id")
        .eq("instagram_user_id", igUserId)
        .eq("status", "connected")
        .maybeSingle();

      if (!rawAccount) {
        // Fallback: Check if there's a connected account in the workspace
        const { data: allAccounts } = await (supabase
          .from("instagram_accounts") as any)
          .select("id, workspace_id, encrypted_access_token, status, username, instagram_user_id")
          .eq("status", "connected");

        if (allAccounts && allAccounts.length === 1) {
          rawAccount = allAccounts[0];
          console.log(`[Webhook] Matched single connected account @${rawAccount.username} (${rawAccount.instagram_user_id}) for entry.id ${igUserId}`);
        } else if (allAccounts && allAccounts.length > 1) {
          for (const acc of allAccounts) {
            try {
              const accToken = decrypt(acc.encrypted_access_token);
              const meRes = await fetch(`https://graph.instagram.com/v19.0/me?access_token=${accToken}`);
              const meData = await meRes.json();
              if (meData?.id === igUserId || acc.username === commenterUsername) {
                rawAccount = acc;
                break;
              }
            } catch {}
          }
        }
      }

      const account = rawAccount as AccountRow | null;
      if (!account) { console.warn(`[Webhook] No connected account found for IG user ${igUserId}`); continue; }

      const isSelfComment = commenterId === igUserId || (account.username && commenterUsername === account.username);
      if (isSelfComment) {
        console.log(`[Webhook] Comment was made by the account owner @${account.username}`);
      }

      const workspaceId = account.workspace_id;
      const isNew = await checkAndMarkProcessed(`comment:${commentId}`, workspaceId);
      if (!isNew) { console.log(`[Webhook] Duplicate skipped: comment:${commentId}`); continue; }

      let dbMediaId: string | null = null;
      if (mediaId) {
        const { data: rawMedia } = await (supabase.from("instagram_media") as any).select("id")
          .eq("workspace_id", workspaceId).eq("instagram_media_id", mediaId).maybeSingle();
        dbMediaId = (rawMedia as MediaRow | null)?.id || null;

        if (!dbMediaId) {
          const { data: createdMedia } = await (supabase.from("instagram_media") as any).insert({
            workspace_id: workspaceId,
            instagram_account_id: account.id,
            instagram_media_id: mediaId,
            media_type: "UNKNOWN",
          }).select("id").maybeSingle();
          dbMediaId = (createdMedia as MediaRow | null)?.id || null;
        }
      }

      const { data: rawAutomations } = await (supabase.from("automations") as any)
        .select("id, name, public_reply, private_message, product_id, dm_enabled, public_reply_enabled, trigger_count, success_count, failure_count, reply_to_all, instagram_media_id, automation_keywords(keyword), products(name, price, url, currency)")
        .eq("workspace_id", workspaceId).eq("instagram_account_id", account.id).eq("status", "active");
      const automations = (rawAutomations || []) as unknown as AutomationRow[];
      if (!automations.length) {
        console.log(`[Webhook] No active automations for workspace ${workspaceId} and account ${account.id}`);
        continue;
      }

      for (const automation of automations) {
        // Scoping check: If automation targets a specific reel/post (and not reply_to_all)
        const isScoped = !automation.reply_to_all && !!automation.instagram_media_id;
        if (isScoped) {
          if (!dbMediaId || (automation.instagram_media_id !== dbMediaId && automation.instagram_media_id !== mediaId)) {
            console.log(`[Webhook] Automation "${automation.name}" targets media ${automation.instagram_media_id}, but comment was on ${dbMediaId || mediaId}. Skipping.`);
            continue;
          }
        }

        const keywords = (automation.automation_keywords || []).map(k => k.keyword);
        const matchedKeyword = matchesAnyKeyword(commentText, keywords);
        if (!matchedKeyword) continue;

        console.log(`[Webhook] Matched automation "${automation.name}" with keyword "${matchedKeyword}"!`);

        const product = automation.products;
        const { data: rawEvent } = await (supabase.from("automation_events") as any).insert({
          workspace_id: workspaceId, automation_id: automation.id, instagram_account_id: account.id,
          instagram_media_id: dbMediaId, commenter_ig_id: commenterId || null,
          commenter_username: commenterUsername || null, comment_text: commentText,
          comment_ig_id: commentId, keyword_matched: matchedKeyword, status: "processing",
        } as never).select().single();
        const event = rawEvent as EventRow | null;
        if (!event) continue;

        let accessToken: string;
        try { accessToken = decrypt(account.encrypted_access_token); }
        catch {
          await (supabase.from("automation_events") as any).update({ status: "failed", error_message: "Token decryption failed" } as never).eq("id", event.id);
          continue;
        }

        // Update trigger count
        await (supabase.from("automations") as any).update({ trigger_count: automation.trigger_count + 1 } as never).eq("id", automation.id).catch(() => {});

        // 1. Prepare message variables for DM
        const vars = buildMessageVariables({
          firstName: commenterUsername?.split("_")[0] || commenterUsername,
          username: commenterUsername,
          productName: product?.name,
          productPrice: product?.price ? `${product.currency === "INR" ? "₹" : "$"}${product.price}` : undefined,
          productUrl: product?.url || undefined,
        });
        const dmMessage = automation.private_message ? interpolateTemplate(automation.private_message, vars) : null;

        // 2. Dispatch all actions concurrently (Likes, Public Reply, Private DM) for lightning-fast execution
        const tasks: Promise<any>[] = [];

        // Task A: Auto-likes (silent background)
        tasks.push(
          Promise.allSettled([
            likeInstagramComment(accessToken, commentId, igUserId),
            mediaId ? likeInstagramMedia(accessToken, mediaId, igUserId) : Promise.resolve(),
          ]).catch(() => null)
        );

        // Task B: Public Reply
        let publicReplyPromise: Promise<boolean>;
        if (automation.public_reply_enabled && automation.public_reply) {
          publicReplyPromise = withRetry(
            () => sendInstagramPublicReply(accessToken, commentId, automation.public_reply!),
            {},
            (err) => err instanceof InstagramApiError && err.isPermanent
          )
            .then(() => true)
            .catch((err) => {
              console.error("[Webhook] Public reply failed:", err?.message || err);
              return false;
            });
        } else {
          publicReplyPromise = Promise.resolve(false);
        }

        // Task C: Private DM
        let dmPromise: Promise<boolean>;
        if (automation.dm_enabled && dmMessage && !isSelfComment) {
          dmPromise = withRetry(
            () => sendInstagramPrivateReply(accessToken, igUserId, commentId, dmMessage, commenterId),
            {},
            (err) => err instanceof InstagramApiError && err.isPermanent
          )
            .then(() => true)
            .catch((err) => {
              console.error("[Webhook] Private DM failed:", err?.message || err);
              return false;
            });
        } else {
          dmPromise = Promise.resolve(false);
        }

        // Await all concurrent tasks
        const [, publicReplyOk, dmOk] = await Promise.all([
          tasks[0],
          publicReplyPromise,
          dmPromise,
        ]);

        const finalStatus = (publicReplyOk || dmOk) ? "success" : "failed";
        await (supabase.from("automation_events") as any).update({
          status: finalStatus,
          public_reply_status: automation.public_reply_enabled ? (publicReplyOk ? "success" : "failed") : null,
          dm_status: automation.dm_enabled ? (isSelfComment ? "skipped_self" : (dmOk ? "success" : "failed")) : null,
          error_message: !publicReplyOk && !dmOk ? "Delivery failed" : null,
          processed_at: new Date().toISOString(),
        } as never).eq("id", event.id);

        const countUpdate = finalStatus === "success"
          ? { success_count: automation.success_count + 1 }
          : { failure_count: automation.failure_count + 1 };
        await (supabase.from("automations") as any).update(countUpdate as never).eq("id", automation.id).then(() => null, () => null);

        break;
      }
    }
  }
}

