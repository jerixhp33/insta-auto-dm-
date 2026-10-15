import crypto from "crypto";
import { validateWebhookSignature } from "@/lib/security/webhook";

const TEST_SECRET = "test-app-secret";

function makeSignature(body: string, secret = TEST_SECRET): string {
  const hash = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return `sha256=${hash}`;
}

describe("validateWebhookSignature", () => {
  const originalSecret = process.env.META_APP_SECRET;

  beforeAll(() => { process.env.META_APP_SECRET = TEST_SECRET; });
  afterAll(() => { process.env.META_APP_SECRET = originalSecret; });

  it("validates correct signature", () => {
    const body = '{"object":"instagram","entry":[]}';
    const sig = makeSignature(body);
    expect(validateWebhookSignature(body, sig)).toBe(true);
  });

  it("rejects tampered body", () => {
    const body = '{"object":"instagram","entry":[]}';
    const sig = makeSignature(body);
    const tamperedBody = '{"object":"instagram","entry":[],"injected":true}';
    expect(validateWebhookSignature(tamperedBody, sig)).toBe(false);
  });

  it("rejects missing signature", () => {
    const body = '{"object":"instagram"}';
    expect(validateWebhookSignature(body, null)).toBe(false);
  });

  it("rejects wrong algorithm prefix", () => {
    const body = '{"object":"instagram"}';
    const hash = crypto.createHmac("sha256", TEST_SECRET).update(body).digest("hex");
    expect(validateWebhookSignature(body, `sha1=${hash}`)).toBe(false);
  });

  it("rejects empty signature", () => {
    const body = '{"object":"instagram"}';
    expect(validateWebhookSignature(body, "")).toBe(false);
  });

  it("rejects signature with wrong secret", () => {
    const body = '{"object":"instagram"}';
    const wrongSig = makeSignature(body, "wrong-secret");
    expect(validateWebhookSignature(body, wrongSig)).toBe(false);
  });
});
