import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  validateOAuthState,
  exchangeInstagramCodeForToken,
  getLongLivedInstagramToken,
  getInstagramDirectProfile,
  exchangeCodeForToken,
  getLongLivedToken,
  getInstagramAccountInfo,
  storeEncryptedToken,
} from "@/lib/instagram/auth";
import { subscribeToWebhooks } from "@/lib/instagram/client";
import { logActivity } from "@/lib/auth";

interface OAuthStateRow { id: string; user_id: string; workspace_id: string; }
interface PageData { instagram_business_account?: { id: string; username: string; name?: string; profile_picture_url?: string; account_type?: string; }; }

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  let code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) return NextResponse.redirect(new URL("/dashboard/instagram?error=oauth_denied", request.url));
  if (!code || !state) return NextResponse.redirect(new URL("/dashboard/instagram?error=invalid_callback", request.url));

  // Instagram sometimes appends #_ fragment or trailing characters to code
  code = code.replace(/#_.*$/, "").trim();

  const rawState = await validateOAuthState(state);
  const oauthState = rawState as OAuthStateRow | null;
  if (!oauthState) return NextResponse.redirect(new URL("/dashboard/instagram?error=invalid_state", request.url));

  const supabase = await createServiceClient();

  // 1. Try Direct Instagram Login (Option A)
  try {
    const igTokenData = await exchangeInstagramCodeForToken(code);
    const { access_token: longToken, expires_in } = await getLongLivedInstagramToken(igTokenData.access_token);
    const profile = await getInstagramDirectProfile(longToken, igTokenData.user_id);

    const encryptedToken = storeEncryptedToken(longToken);
    const expiresAt = new Date(Date.now() + (expires_in || 5_184_000) * 1000);
    const igUserId = String(profile.user_id || profile.id || igTokenData.user_id);

    await supabase.from("instagram_accounts").upsert({
      workspace_id: oauthState.workspace_id,
      instagram_user_id: igUserId,
      username: profile.username,
      name: profile.name || profile.username,
      profile_picture_url: profile.profile_picture_url || null,
      account_type: profile.account_type || "BUSINESS",
      encrypted_access_token: encryptedToken,
      token_expires_at: expiresAt.toISOString(),
      status: "connected",
      permissions: ["instagram_business_basic", "instagram_business_manage_messages", "instagram_business_manage_comments"],
      last_synced_at: new Date().toISOString(),
    } as never, { onConflict: "workspace_id,instagram_user_id" });

    // Auto-subscribe account to Meta webhooks
    try {
      await subscribeToWebhooks(longToken, igUserId);
    } catch (subErr) {
      console.warn("[OAuth] Failed to auto-subscribe webhooks:", subErr);
    }

    await logActivity({
      workspaceId: oauthState.workspace_id,
      userId: oauthState.user_id,
      action: "instagram_connected",
      metadata: { accounts_connected: 1, provider: "instagram_direct", username: profile.username },
    });

    return NextResponse.redirect(new URL("/dashboard/instagram?success=connected", request.url));
  } catch (directErr) {
    console.warn("[Instagram Direct OAuth fallback]:", directErr instanceof Error ? directErr.message : directErr);

    // 2. Fallback to Facebook Login flow
    try {
      const { access_token: shortToken } = await exchangeCodeForToken(code);
      const { access_token: longToken, expires_in } = await getLongLivedToken(shortToken);
      const pagesData = await getInstagramAccountInfo(longToken);
      const pages: PageData[] = pagesData?.data || [];
      let accountsConnected = 0;

      for (const page of pages) {
        const igAccount = page.instagram_business_account;
        if (!igAccount) continue;
        const encryptedToken = storeEncryptedToken(longToken);
        const expiresAt = new Date(Date.now() + (expires_in || 5_184_000) * 1000);
        await supabase.from("instagram_accounts").upsert({
          workspace_id: oauthState.workspace_id,
          instagram_user_id: igAccount.id,
          username: igAccount.username,
          name: igAccount.name || null,
          profile_picture_url: igAccount.profile_picture_url || null,
          account_type: igAccount.account_type || null,
          encrypted_access_token: encryptedToken,
          token_expires_at: expiresAt.toISOString(),
          status: "connected",
          permissions: ["instagram_basic", "instagram_manage_comments", "instagram_manage_messages"],
          last_synced_at: new Date().toISOString(),
        } as never, { onConflict: "workspace_id,instagram_user_id" });

        try {
          await subscribeToWebhooks(longToken, igAccount.id);
        } catch {}

        accountsConnected++;
      }

      await logActivity({
        workspaceId: oauthState.workspace_id,
        userId: oauthState.user_id,
        action: "instagram_connected",
        metadata: { accounts_connected: accountsConnected, provider: "facebook" },
      });

      if (accountsConnected === 0) return NextResponse.redirect(new URL("/dashboard/instagram?error=no_instagram_account", request.url));
      return NextResponse.redirect(new URL("/dashboard/instagram?success=connected", request.url));
    } catch (fbErr) {
      console.error("[OAuth Connection Error]", fbErr instanceof Error ? fbErr.message : "Unknown");
      return NextResponse.redirect(new URL("/dashboard/instagram?error=connection_failed", request.url));
    }
  }
}
