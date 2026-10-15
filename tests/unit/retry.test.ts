import { withRetry } from "@/lib/automation/retry";

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0, jitter: false });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient failure then succeeds", async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue("ok");
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0, jitter: false });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after maxAttempts exhausted", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("always fails"));
    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0, jitter: false })
    ).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry permanent errors", async () => {
    const permError = new Error("permanent");
    const fn = jest.fn().mockRejectedValue(permError);
    const isPermanent = (err: Error) => err.message === "permanent";
    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0, jitter: false }, isPermanent)
    ).rejects.toThrow("permanent");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
