/**
 * Official Meta Graph API client.
 * Server-side only. Never import in client components.
 */

export const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

export interface GraphApiError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

export class InstagramApiError extends Error {
  constructor(
    message: string,
    public code: number,
    public type: string,
    public isPermanent: boolean
  ) {
    super(message);
    this.name = "InstagramApiError";
  }
}

function isPermanentError(code: number): boolean {
  // Permanent errors that should not be retried
  const permanentCodes = [
    100, // Invalid parameter / permission
    200, // Permission error
    10,  // Application does not have permission
    190, // Invalid OAuth access token
    104, // Requires valid user access token
  ];
  return permanentCodes.includes(code);
}

export async function graphApiRequest<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const hosts = ["https://graph.instagram.com/v19.0", "https://graph.facebook.com/v19.0"];
  let lastError: any = null;

  for (const host of hosts) {
    try {
      const url = `${host}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const err = (data as GraphApiError).error;
        lastError = new InstagramApiError(
          err?.message || "Instagram API error",
          err?.code || response.status,
          err?.type || "unknown",
          isPermanentError(err?.code || 0)
        );
        continue;
      }

      return data as T;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("Failed to execute Instagram API request");
}

export async function likeInstagramComment(
  accessToken: string,
  commentId: string,
  igUserId?: string
) {
  // Method 1: Try official IG user likes endpoint with comment_id
  if (igUserId) {
    try {
      return await graphApiRequest(`/${igUserId}/likes`, accessToken, {
        method: "POST",
        body: JSON.stringify({ comment_id: commentId }),
      });
    } catch (e1) {
      console.warn(`[Instagram Like User Node] Failed, trying direct comment endpoint:`, e1 instanceof Error ? e1.message : e1);
    }
  }

  // Method 2: Fallback to direct comment likes endpoint
  try {
    return await graphApiRequest(`/${commentId}/likes`, accessToken, {
      method: "POST",
    });
  } catch (err) {
    console.warn(`[Instagram Like] Failed on ${commentId}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function likeInstagramMedia(
  accessToken: string,
  mediaId: string,
  igUserId?: string
) {
  if (igUserId) {
    try {
      return await graphApiRequest(`/${igUserId}/likes`, accessToken, {
        method: "POST",
        body: JSON.stringify({ media_id: mediaId }),
      });
    } catch {
      // fallback
    }
  }

  try {
    return await graphApiRequest(`/${mediaId}/likes`, accessToken, {
      method: "POST",
    });
  } catch (err) {
    console.warn(`[Instagram Like Media] Failed on ${mediaId}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function sendInstagramPublicReply(accessToken: string, commentId: string, message: string) {
  return graphApiRequest(`/${commentId}/replies`, accessToken, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function sendInstagramPrivateReply(
  accessToken: string,
  igUserId: string,
  commentId: string,
  message: string,
  recipientId?: string
) {
  const endpoints = [
    igUserId ? `/${igUserId}/messages` : null,
    "/me/messages",
  ].filter(Boolean) as string[];

  let lastError: unknown;
  for (const endpoint of endpoints) {
    // Attempt 1: Official Instagram comment_id private reply
    try {
      return await graphApiRequest(endpoint, accessToken, {
        method: "POST",
        body: JSON.stringify({
          recipient: { comment_id: commentId },
          message: { text: message },
        }),
      });
    } catch (err) {
      lastError = err;
      console.warn(`[Instagram DM comment_id on ${endpoint}] failed:`, err instanceof Error ? err.message : err);
    }

    // Attempt 2: Fallback to direct recipient ID if provided
    if (recipientId) {
      try {
        return await graphApiRequest(endpoint, accessToken, {
          method: "POST",
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: message },
          }),
        });
      } catch (err) {
        lastError = err;
        console.warn(`[Instagram DM recipientId on ${endpoint}] failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  throw lastError;
}

export async function subscribeToWebhooks(accessToken: string, igUserId: string): Promise<boolean> {
  const fields = ["comments", "messages", "messaging_postbacks"];
  // 1. Direct Instagram Graph API /{igUserId}/subscribed_apps
  try {
    const res = await graphApiRequest<{ success?: boolean }>(`/${igUserId}/subscribed_apps`, accessToken, {
      method: "POST",
      body: JSON.stringify({ subscribed_fields: fields }),
    });
    if (res?.success) return true;
  } catch (err: any) {
    console.warn(`[Instagram Webhook Subscribe] direct ${igUserId} failed:`, err?.message || err);
  }

  // 2. Direct Instagram Graph API /me/subscribed_apps
  try {
    const res = await graphApiRequest<{ success?: boolean }>(`/me/subscribed_apps`, accessToken, {
      method: "POST",
      body: JSON.stringify({ subscribed_fields: fields }),
    });
    if (res?.success) return true;
  } catch (err: any) {
    console.warn(`[Instagram Webhook Subscribe] /me failed:`, err?.message || err);
  }

  // 3. Facebook Graph API fallback
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/subscribed_apps?subscribed_fields=${fields.join(",")}&access_token=${accessToken}`, {
      method: "POST",
    });
    const data = await res.json();
    if (data?.success) return true;
  } catch {}

  return false;
}

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

export async function fetchInstagramUserMedia(
  accessToken: string,
  igUserId?: string,
  limit = 50
): Promise<{ data: InstagramMediaItem[] }> {
  // Safe fields supported by both Instagram User and Page access tokens
  const safeFields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";

  // Attempt 1: /me/media with safe fields
  try {
    const res = await graphApiRequest<{ data: InstagramMediaItem[] }>(
      `/me/media?fields=${safeFields}&limit=${limit}`,
      accessToken
    );
    if (res && Array.isArray(res.data)) {
      return res;
    }
  } catch (err1: any) {
    console.warn("[Instagram Media Fetch] /me/media failed:", err1?.message || err1);
  }

  // Attempt 2: If igUserId provided, try /{igUserId}/media
  if (igUserId) {
    try {
      const res = await graphApiRequest<{ data: InstagramMediaItem[] }>(
        `/${igUserId}/media?fields=${safeFields}&limit=${limit}`,
        accessToken
      );
      if (res && Array.isArray(res.data)) {
        return res;
      }
    } catch (err2: any) {
      console.warn(`[Instagram Media Fetch] /${igUserId}/media failed:`, err2?.message || err2);
    }
  }

  // Attempt 3: Core minimal fields fallback
  try {
    return await graphApiRequest<{ data: InstagramMediaItem[] }>(
      `/me/media?fields=id,caption,media_type,permalink,timestamp&limit=${limit}`,
      accessToken
    );
  } catch (err3: any) {
    console.error("[Instagram Media Fetch] Minimal fields fetch failed:", err3?.message || err3);
    throw err3;
  }
}
