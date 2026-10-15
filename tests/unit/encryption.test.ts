import { encrypt, decrypt } from "@/lib/encryption";

// Use a fixed 32-byte hex key for testing
const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("encrypt / decrypt", () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeAll(() => { process.env.ENCRYPTION_KEY = TEST_KEY; });
  afterAll(() => { process.env.ENCRYPTION_KEY = originalKey; });

  it("encrypts and decrypts a string", () => {
    const plaintext = "my-instagram-access-token";
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const plaintext = "same-token";
    const c1 = encrypt(plaintext);
    const c2 = encrypt(plaintext);
    expect(c1).not.toBe(c2);
    expect(decrypt(c1)).toBe(plaintext);
    expect(decrypt(c2)).toBe(plaintext);
  });

  it("fails to decrypt tampered ciphertext", () => {
    const ciphertext = encrypt("token");
    const tampered = ciphertext.slice(0, -4) + "XXXX";
    expect(() => decrypt(tampered)).toThrow();
  });

  it("handles unicode and special characters", () => {
    const text = "token-with-special-chars-!@#$%^&*()_+💎";
    expect(decrypt(encrypt(text))).toBe(text);
  });
});
