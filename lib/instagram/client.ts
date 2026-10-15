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
  const url = `${GRAPH_API_BASE}${endpoint}`;

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
    throw new InstagramApiError(
      err?.message || "Instagram API error",
      err?.code || response.status,
      err?.type || "unknown",
      isPermanentError(err?.code || 0)
    );
  }

  return data as T;
}
