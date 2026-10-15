import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

// Facebook Login for Business scopes
const FB_REQUIRED_SCOPES = [
  "instagram_basic",
  "instagram_manage_comments",
  "instagram_manage_messages",
  "pages_show_list",
  "pages_read_engagement",
].join(",");

// Direct Instagram Login for Professionals scopes
const IG_REQUIRED_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");

export const getMetaAppId = () => process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID || "";
export const getMetaAppSecret = () => process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || "";
export const getMetaRedirectUri = () => {
  if (process.env.META_REDIRECT_URI) return process.env.META_REDIRECT_URI;
  if (process.env.NEXT_PUBLIC_APP_URL) return `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/instagram/callback`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/instagram/callback`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api/instagram/callback`;
  return "http://localhost:3000/api/instagram/callback";
};

export function generateOAuthUrl(state: string, provider: "instagram" | "facebook" = "instagram"): string {
  const appId = getMetaAppId();
  const redirectUri = getMetaRedirectUri();

  if (provider === "facebook") {
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: FB_REQUIRED_SCOPES,
      response_type: "code",
      state,
    });
    return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
  }

  // Direct Instagram Login (Option A) - prompts directly on Instagram without requiring Facebook
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: IG_REQUIRED_SCOPES,
    response_type: "code",
    state,
    enable_fb_login: "0",
    force_authentication: "1",
  });

  return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function createOAuthState(userId: string, workspaceId: string): Promise<string> {
  const state = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const supabase = await createServiceClient();
  await supabase.from("oauth_states").insert({
    state,
    user_id: userId,
    workspace_id: workspaceId,
    expires_at: expiresAt.toISOString(),
    used: false,
  } as never);

  return state;
}

export async function validateOAuthState(state: string) {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("oauth_states")
    .select("*")
    .eq("state", state)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!data) return null;

  // Mark as used immediately (one-time use)
  await supabase.from("oauth_states").update({ used: true } as never).eq("id", (data as { id: string }).id);

  return data;
}

// Direct Instagram code exchange
export async function exchangeInstagramCodeForToken(code: string): Promise<{
  access_token: string;
  user_id: number | string;
  permissions?: string[];
}> {
  const formData = new FormData();
  formData.append("client_id", getMetaAppId());
  formData.append("client_secret", getMetaAppSecret());
  formData.append("grant_type", "authorization_code");
  formData.append("redirect_uri", getMetaRedirectUri());
  formData.append("code", code);

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error_message || err?.error?.message || "Failed to exchange Instagram code for token");
  }

  return response.json();
}

// Direct Instagram long-lived token exchange (60 days)
export async function getLongLivedInstagramToken(shortLivedToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: getMetaAppSecret(),
    access_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.instagram.com/access_token?${params.toString()}`
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to exchange for long-lived Instagram token");
  }

  return response.json();
}

// Fetch user profile from graph.instagram.com
export async function getInstagramDirectProfile(accessToken: string, userId?: string | number): Promise<{
  id: string;
  user_id?: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  account_type?: string;
}> {
  const target = userId ? `${userId}` : "me";
  const response = await fetch(
    `https://graph.instagram.com/v19.0/${target}?fields=user_id,username,name,profile_picture_url,account_type&access_token=${accessToken}`
  );

  if (!response.ok) {
    const fallbackRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`
    );
    if (!fallbackRes.ok) {
      const err = await fallbackRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to fetch Instagram profile");
    }
    return fallbackRes.json();
  }

  return response.json();
}

// Classic Facebook code exchange (fallback)
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
}> {
  const params = new URLSearchParams({
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    redirect_uri: getMetaRedirectUri(),
    code,
  });

  const response = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || "Failed to exchange code for token");
  }

  return response.json();
}

// Classic Facebook long-lived token exchange (fallback)
export async function getLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || "Failed to get long-lived token");
  }

  return response.json();
}

// Classic Facebook Instagram accounts lookup (fallback)
export async function getInstagramAccountInfo(accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id,name,username,profile_picture_url,account_type}&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Instagram account info");
  }

  const data = await response.json();
  return data;
}

export function storeEncryptedToken(token: string) {
  return encrypt(token);
}
