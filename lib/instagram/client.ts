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
  // Official Instagram Graph API Private Reply to comment
  try {
    return await graphApiRequest(`/${igUserId}/messages`, accessToken, {
      method: "POST",
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text: message },
      }),
    });
  } catch (err) {
    // If private reply by comment_id fails and recipientId is provided, fallback to direct recipient
    if (recipientId) {
      return await graphApiRequest(`/${igUserId}/messages`, accessToken, {
        method: "POST",
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
        }),
      });
    }
    throw err;
  }
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
  limit = 25
): Promise<{ data: InstagramMediaItem[] }> {
  const fields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "thumbnail_url",
    "permalink",
    "timestamp",
    "like_count",
    "comments_count",
  ].join(",");

  return graphApiRequest<{ data: InstagramMediaItem[] }>(
    `/me/media?fields=${fields}&limit=${limit}`,
    accessToken
  );
}
