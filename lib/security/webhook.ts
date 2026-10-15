import crypto from "crypto";

/**
 * Validates Meta webhook request authenticity using HMAC-SHA256.
 * Never trust webhook payloads without this check.
 */
export function validateWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;

  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) throw new Error("META_APP_SECRET not configured");

  // Meta sends: sha256=<hex_hash>
  const [algorithm, hash] = signature.split("=");
  if (algorithm !== "sha256" || !hash) return false;

  const expectedHash = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(expectedHash, "hex")
  );
}

export function generateWebhookState(): string {
  return crypto.randomBytes(32).toString("hex");
}
