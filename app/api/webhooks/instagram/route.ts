/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateWebhookSignature } from "@/lib/security/webhook";
import { checkAndMarkProcessed } from "@/lib/automation/idempotency";
import { matchesAnyKeyword, interpolateTemplate, buildMessageVariables } from "@/lib/automation/matcher";
import { decrypt } from "@/lib/encryption";
import { withRetry } from "@/lib/automation/retry";
import { InstagramApiError } from "@/lib/instagram/client";

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
  if (!validateWebhookSignature(rawBody, signature)) return new NextResponse("Unauthorized", { status: 401 });

  let payload: WebhookPayload;
  try { payload = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  processWebhookAsync(payload).catch(err => console.error("[Webhook] Error:", err?.message));
  return NextResponse.json({ received: true }, { status: 200 });
}

interface WebhookPayload { object: string; entry: { id: string; changes: { value: { media_id?: string; comment_id?: string; from?: { id: string; username?: string }; text?: string; id?: string; }; field: string; }[]; }[]; }
interface AccountRow { id: string; workspace_id: string; encrypted_access_token: string; status: string; username: string; }
interface MediaRow { id: string; }
interface AutomationRow {
  id: string; name: string; public_reply: string | null; private_message: string | null; product_id: string | null;
  dm_enabled: boolean; public_reply_enabled: boolean; trigger_count: number; success_count: number; failure_count: number;
  automation_keywords: { keyword: string }[];
  products: { name: string; price: number | null; url: string | null; currency: string } | null;
}
interface AutomationScopedRow { instagram_media_id: string | null; }
interface EventRow { id: string; }

async function processWebhookAsync(payload: WebhookPayload) {
  if (payload.object !== "instagram") return;
  const supabase = await createServiceClient();

  for (const entry of payload.entry || []) {
    const igUserId = entry.id;
    for (const change of entry.changes || []) {
      if (change.field !== "comments") continue;
      const { value } = change;
      const commentId = value.comment_id || value.id;
      const mediaId = value.media_id;
      const commentText = value.text;
      const commenterId = value.from?.id;
      const commenterUsername = value.from?.username;
      if (!commentId || !mediaId || !commentText) continue;

      const { data: rawAccount } = await supabase
        .from("instagram_accounts").select("id, workspace_id, encrypted_access_token, status, username")
        .eq("instagram_user_id", igUserId).eq("status", "connected").single();
      const account = rawAccount as AccountRow | null;
      if (!account) { console.warn(`[Webhook] No account for IG user ${igUserId}`); continue; }

      const workspaceId = account.workspace_id;
      const isNew = await checkAndMarkProcessed(`comment:${commentId}`, workspaceId);
      if (!isNew) { console.log(`[Webhook] Duplicate skipped: comment:${commentId}`); continue; }

      const { data: rawMedia } = await (supabase.from("instagram_media") as any).select("id")
        .eq("workspace_id", workspaceId).eq("instagram_media_id", mediaId).single();
      const dbMediaId = (rawMedia as MediaRow | null)?.id || null;

      const { data: rawAutomations } = await (supabase.from("automations") as any)
        .select("id, name, public_reply, private_message, product_id, dm_enabled, public_reply_enabled, trigger_count, success_count, failure_count, automation_keywords(keyword), products(name, price, url, currency)")
        .eq("workspace_id", workspaceId).eq("instagram_account_id", account.id).eq("status", "active");
      const automations = (rawAutomations || []) as unknown as AutomationRow[];
      if (!automations.length) continue;

      for (const automation of automations) {
        const { data: rawScoped } = await (supabase.from("automations") as any).select("instagram_media_id").eq("id", automation.id).single();
        const scoped = rawScoped as AutomationScopedRow | null;
        if (scoped?.instagram_media_id && scoped.instagram_media_id !== dbMediaId) continue;

        const keywords = (automation.automation_keywords || []).map(k => k.keyword);
        const matchedKeyword = matchesAnyKeyword(commentText, keywords);
        if (!matchedKeyword) continue;

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

        let publicReplyOk = false, dmOk = false;
        let errorMsg: string | null = null;

        if (automation.public_reply_enabled && automation.public_reply) {
          try {
            await withRetry(() => sendPublicReply(accessToken, commentId, automation.public_reply!), {},
              (err) => err instanceof InstagramApiError && err.isPermanent);
            publicReplyOk = true;
          } catch (err) { errorMsg = err instanceof Error ? err.message : "Public reply failed"; }
        }

        if (automation.dm_enabled && automation.private_message && commenterId) {
          try {
            const vars = buildMessageVariables({
              firstName: commenterUsername?.split("_")[0], username: commenterUsername,
              productName: product?.name, productPrice: product?.price ? `${product.currency === "INR" ? "₹" : "$"}${product.price}` : undefined,
              productUrl: product?.url || undefined,
            });
            const message = interpolateTemplate(automation.private_message, vars);
            await withRetry(() => sendDirectMessage(accessToken, igUserId, commenterId, message), {},
              (err) => err instanceof InstagramApiError && err.isPermanent);
            dmOk = true;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "DM failed";
            errorMsg = errorMsg ? `${errorMsg}; ${msg}` : msg;
          }
        }

        const finalStatus = (publicReplyOk || dmOk) ? "success" : "failed";
        await (supabase.from("automation_events") as any).update({
          status: finalStatus,
          public_reply_status: automation.public_reply_enabled ? (publicReplyOk ? "success" : "failed") : null,
          dm_status: (automation.dm_enabled && commenterId) ? (dmOk ? "success" : "failed") : null,
          error_message: errorMsg, processed_at: new Date().toISOString(),
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

async function sendPublicReply(accessToken: string, commentId: string, message: string) {
  const response = await fetch(`https://graph.facebook.com/v19.0/${commentId}/replies`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: accessToken }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new InstagramApiError(err?.error?.message || "Public reply failed", err?.error?.code || response.status, err?.error?.type || "unknown", [100,200,190,10].includes(err?.error?.code));
  }
  return response.json();
}

async function sendDirectMessage(accessToken: string, igUserId: string, recipientId: string, message: string) {
  const response = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/messages`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text: message }, access_token: accessToken }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new InstagramApiError(err?.error?.message || "DM failed", err?.error?.code || response.status, err?.error?.type || "unknown", [100,200,190,10].includes(err?.error?.code));
  }
  return response.json();
}
