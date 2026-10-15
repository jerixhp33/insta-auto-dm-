import { sleep } from "@/lib/utils";

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitter: true,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  isPermanentError?: (error: Error) => boolean
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry permanent errors
      if (isPermanentError && isPermanentError(lastError)) {
        throw lastError;
      }

      if (attempt < opts.maxAttempts) {
        const delay = calculateBackoff(attempt, opts);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

function calculateBackoff(attempt: number, opts: RetryOptions): number {
  const exponential = Math.min(
    opts.baseDelayMs * Math.pow(2, attempt - 1),
    opts.maxDelayMs
  );

  if (opts.jitter) {
    return exponential * (0.5 + Math.random() * 0.5);
  }

  return exponential;
}
