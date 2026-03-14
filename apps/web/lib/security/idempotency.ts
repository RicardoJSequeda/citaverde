import { v4 as uuid } from "uuid"
import { Redis } from "@upstash/redis"

// ==================== REDIS CLIENT ====================

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
})

// ==================== IDEMPOTENCY KEY MANAGER ====================

export class IdempotencyManager {
  private readonly ttlSeconds = 86400 * 7 // 7 days

  /**
   * Generate a new idempotency key
   */
  generateKey(): string {
    return `idempotency:${uuid()}`
  }

  /**
   * Check if operation was already processed
   */
  async checkExists(idempotencyKey: string): Promise<{ exists: boolean; result?: any }> {
    try {
      const cached = await redis.get(idempotencyKey)

      if (cached) {
        return {
          exists: true,
          result: typeof cached === "string" ? JSON.parse(cached) : cached,
        }
      }

      return { exists: false }
    } catch (error) {
      console.error(`Error checking idempotency key ${idempotencyKey}:`, error)
      return { exists: false }
    }
  }

  /**
   * Store operation result
   */
  async storeResult(idempotencyKey: string, result: any): Promise<boolean> {
    try {
      await redis.setex(idempotencyKey, this.ttlSeconds, JSON.stringify(result))
      return true
    } catch (error) {
      console.error(`Error storing idempotency result:`, error)
      return false
    }
  }

  /**
   * Mark operation as in-progress to prevent race conditions
   */
  async markInProgress(idempotencyKey: string): Promise<boolean> {
    try {
      const lockKey = `${idempotencyKey}:lock`
      const locked = await redis.set(lockKey, "1", {
        ex: 60, // Lock expires after 60 seconds
        nx: true, // Only set if doesn't exist
      })
      return locked === "OK"
    } catch (error) {
      console.error(`Error marking in-progress:`, error)
      return false
    }
  }

  /**
   * Wrap operation with idempotency
   */
  async withIdempotency<T>(
    idempotencyKey: string,
    operation: () => Promise<T>,
  ): Promise<{ success: boolean; data?: T; error?: string; cached?: boolean }> {
    // Check if already processed
    const existing = await this.checkExists(idempotencyKey)
    if (existing.exists) {
      return {
        success: true,
        data: existing.result,
        cached: true,
      }
    }

    // Mark as in-progress
    const locked = await this.markInProgress(idempotencyKey)
    if (!locked) {
      // Someone else is processing this
      // Wait a bit and check again
      await new Promise((resolve) => setTimeout(resolve, 500))
      const check = await this.checkExists(idempotencyKey)
      if (check.exists) {
        return {
          success: true,
          data: check.result,
          cached: true,
        }
      }

      return {
        success: false,
        error: "Operation in progress, please try again",
      }
    }

    try {
      // Execute operation
      const result = await operation()

      // Store result
      await this.storeResult(idempotencyKey, result)

      return {
        success: true,
        data: result,
        cached: false,
      }
    } catch (error) {
      // Clean up lock on error
      await redis.del(`${idempotencyKey}:lock`)

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Clear idempotency result (for manual retry)
   */
  async clear(idempotencyKey: string): Promise<boolean> {
    try {
      await redis.del(idempotencyKey)
      await redis.del(`${idempotencyKey}:lock`)
      return true
    } catch (error) {
      console.error(`Error clearing idempotency key:`, error)
      return false
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{ ttlSeconds: number }> {
    return {
      ttlSeconds: this.ttlSeconds,
    }
  }
}

// ==================== SINGLETON INSTANCE ====================

export const idempotencyManager = new IdempotencyManager()

// ==================== HEADER PARSING ====================

/**
 * Extract idempotency key from request headers
 * Standard header: Idempotency-Key
 */
export function getIdempotencyKeyFromHeaders(headers: Record<string, string>): string | null {
  const key = headers["idempotency-key"] || headers["Idempotency-Key"]
  
  if (!key) {
    return null
  }

  // Validate format (UUID or similar)
  if (!/^[a-f0-9\-]{36}$|^[a-zA-Z0-9\-_]{20,}$/.test(key)) {
    return null
  }

  return key
}

// ==================== MIDDLEWARE FOR ROUTE HANDLERS ====================

/**
 * Wrap API route handler with idempotency support
 */
export function withIdempotency<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  options?: {
    ttlSeconds?: number
  },
): T {
  return (async (...args: any[]) => {
    const request = args[0]

    // Extract idempotency key from headers
    const idempotencyKey = getIdempotencyKeyFromHeaders(request.headers)

    if (!idempotencyKey) {
      // No idempotency key provided, execute normally
      return handler(...args)
    }

    // Check if already processed
    const existing = await idempotencyManager.checkExists(idempotencyKey)
    if (existing.exists) {
      return new Response(JSON.stringify(existing.result), {
        status: 200,
        headers: { "x-idempotency-cached": "true" },
      })
    }

    // Execute handler
    try {
      const result = await handler(...args)

      // Cache result
      if (result instanceof Response) {
        const data = await result.clone().json()
        await idempotencyManager.storeResult(idempotencyKey, data)
      }

      return result
    } catch (error) {
      throw error
    }
  }) as T
}
