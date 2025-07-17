import { env } from "~/env";
import Redis from "ioredis";

export const redis = new Redis(env.REDIS_URL);

const CACHE_EXPIRY_SECONDS = 60 * 60 * 6; // 6 hours
const CACHE_KEY_SEPARATOR = ":";

export const cacheWithRedis = <TFunc extends (...args: any[]) => Promise<any>>(
  keyPrefix: string,
  fn: TFunc,
): TFunc => {
  return (async (...args: Parameters<TFunc>) => {
    // Determine cache behavior based on environment
    const isEvalMode = process.env.EVAL_MODE === "true";
    const skipCacheInEval = process.env.SKIP_CACHE_IN_EVAL === "true";

    // Skip caching entirely if in eval mode and configured to skip
    if (isEvalMode && skipCacheInEval) {
      console.log(`Cache bypassed for ${keyPrefix} (eval mode)`);
      return await fn(...args);
    }

    // Concatenate eval prefix if in eval mode
    const actualPrefix = isEvalMode ? `eval-${keyPrefix}` : keyPrefix;
    const key = `${actualPrefix}${CACHE_KEY_SEPARATOR}${JSON.stringify(args)}`;
    
    const cachedResult = await redis.get(key);
    if (cachedResult) {
      console.log(`Cache hit for ${key}`);
      return JSON.parse(cachedResult);
    }

    const result = await fn(...args);
    await redis.set(key, JSON.stringify(result), "EX", CACHE_EXPIRY_SECONDS);
    return result;
  }) as TFunc;
};
