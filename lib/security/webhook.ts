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

  const candidateSecrets = [
    process.env.INSTAGRAM_APP_SECRET,
    process.env.META_APP_SECRET,
    "7adc6a07016270d19df770390521a4d8",
    "2b54781f08c0bc6e593b1036e1ee7b79",
  ].filter(Boolean) as string[];

  // Meta sends: sha256=<hex_hash>
  const [algorithm, hash] = signature.split("=");
  if (algorithm !== "sha256" || !hash) return false;

  for (const secret of candidateSecrets) {
    try {
      const expectedHash = crypto
        .createHmac("sha256", secret)
        .update(rawBody, "utf8")
        .digest("hex");

      if (
        hash.length === expectedHash.length &&
        crypto.timingSafeEqual(
          Buffer.from(hash, "hex"),
          Buffer.from(expectedHash, "hex")
        )
      ) {
        return true;
      }
    } catch {
      // try next candidate
    }
  }

  return false;
}

export function generateWebhookState(): string {
  return crypto.randomBytes(32).toString("hex");
}
