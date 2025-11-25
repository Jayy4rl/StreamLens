import { createLogger } from "./logger";

const logger = createLogger("RetryUtil");

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
};

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: string = "Operation"
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | unknown;
  let delay = cfg.delayMs;

  for (let attempt = 1; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === cfg.maxRetries) {
        logger.error(
          `${context} failed after ${cfg.maxRetries} attempts`,
          error
        );
        break;
      }

      logger.warn(
        `${context} failed (attempt ${attempt}/${cfg.maxRetries}), retrying in ${delay}ms`,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );

      await sleep(delay);
      delay = Math.min(delay * cfg.backoffMultiplier, cfg.maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Rate limiter utility
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private running = 0;
  private lastCallTime = 0;

  constructor(private maxConcurrent: number, private minDelayMs: number) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot();

    try {
      this.running++;
      return await fn();
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private async waitForSlot(): Promise<void> {
    // Wait for minimum delay between calls
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    if (timeSinceLastCall < this.minDelayMs) {
      await sleep(this.minDelayMs - timeSinceLastCall);
    }
    this.lastCallTime = Date.now();

    // Wait if we're at max concurrent
    if (this.running >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const resolve = this.queue.shift();
      resolve?.();
    }
  }
}
