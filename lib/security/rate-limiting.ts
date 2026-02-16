import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// ==================== REDIS CLIENT ====================

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
})

// ==================== RATE LIMIT STRATEGIES ====================

// Strict limits for write operations
export const rateLimits = {
  // API endpoints - 100 requests per minute per IP
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "60 s"),
  }),

  // Create appointment - 5 per minute per user
  createAppointment: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "60 s"),
  }),

  // Create queue ticket - 10 per minute per user
  createQueueTicket: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
  }),

  // Cancel appointment - 10 per minute per user
  cancelAppointment: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
  }),

  // Login attempts - 5 per minute per email
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "60 s"),
  }),

  // SMS/Email sends - 3 per hour per user
  sendNotification: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "3600 s"),
  }),

  // Admin operations - 50 per minute
  admin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "60 s"),
  }),

  // Get available slots - 20 per minute per user (read operation, higher limit)
  getAvailableSlots: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "60 s"),
  }),
}

// ==================== RATE LIMIT HELPERS ====================

export async function checkRateLimit(key: string, limiter: Ratelimit): Promise<RateLimitResult> {
  try {
    const { success, limit, remaining, reset, pending } = await limiter.limit(key)

    return {
      success,
      limit,
      remaining,
      reset,
      pending,
      retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : null,
    }
  } catch (error) {
    console.error(`Rate limit check failed for key ${key}:`, error)
    // Fail open: allow request if rate limiting system fails
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      pending: 0,
      retryAfter: null,
    }
  }
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  pending: Promise<RateLimitResult>
  retryAfter: number | null
}

// ==================== USER-SPECIFIC RATE LIMITS ====================

/**
 * Check rate limit for user operation
 * @param userId Authenticated user ID
 * @param operation Operation type (create_appointment, create_queue_ticket, etc)
 * @returns RateLimitResult
 */
export async function checkUserRateLimit(userId: string, operation: string): Promise<RateLimitResult> {
  const key = `ratelimit:user:${userId}:${operation}`

  const limiter = rateLimits[operation as keyof typeof rateLimits] || rateLimits.api

  return checkRateLimit(key, limiter)
}

/**
 * Check rate limit for IP address (API endpoints)
 * @param ip IP address
 * @returns RateLimitResult
 */
export async function checkIPRateLimit(ip: string): Promise<RateLimitResult> {
  const key = `ratelimit:ip:${ip}`
  return checkRateLimit(key, rateLimits.api)
}

/**
 * Check rate limit for email (login attempts)
 * @param email User email
 * @returns RateLimitResult
 */
export async function checkEmailRateLimit(email: string): Promise<RateLimitResult> {
  const key = `ratelimit:email:${email}`
  return checkRateLimit(key, rateLimits.login)
}

// ==================== BURST PROTECTION ====================

/**
 * Advanced rate limiter with burst protection
 * Allows temporary spikes but punishes sustained high traffic
 */
export async function checkBurstProtection(userId: string, operation: string): Promise<BurstProtectionResult> {
  const key = `burst:${userId}:${operation}`

  try {
    // Check current burst score
    const burstScore = (await redis.get<number>(key)) || 0

    // Increment burst score
    const newScore = burstScore + 1
    await redis.setex(key, 3600, newScore) // 1 hour window

    // Calculate if user is in burst
    const isBurst = newScore > 50 // More than 50 requests in 1 hour

    if (isBurst) {
      // Apply exponential backoff
      const backoffSeconds = Math.min(2 ** (Math.floor(newScore / 50) - 1), 300) // Max 5 minutes

      return {
        inBurst: true,
        backoffSeconds,
        currentScore: newScore,
        allowed: false,
      }
    }

    return {
      inBurst: false,
      backoffSeconds: 0,
      currentScore: newScore,
      allowed: true,
    }
  } catch (error) {
    console.error(`Burst protection check failed:`, error)
    // Fail open
    return {
      inBurst: false,
      backoffSeconds: 0,
      currentScore: 0,
      allowed: true,
    }
  }
}

export interface BurstProtectionResult {
  inBurst: boolean
  backoffSeconds: number
  currentScore: number
  allowed: boolean
}

// ==================== QUOTA MANAGEMENT ====================

/**
 * Check daily quota for user (e.g., max appointments per day)
 */
export async function checkDailyQuota(
  userId: string,
  quotaType: "appointments" | "queue_tickets",
  maxPerDay: number = 10,
): Promise<QuotaResult> {
  const today = new Date().toISOString().split("T")[0]
  const key = `quota:${userId}:${quotaType}:${today}`

  try {
    const current = (await redis.get<number>(key)) || 0

    if (current >= maxPerDay) {
      return {
        allowed: false,
        current,
        limit: maxPerDay,
        remaining: 0,
        resetAt: new Date(new Date().setHours(23, 59, 59, 999)),
      }
    }

    // Increment counter
    await redis.incr(key)
    // Set expiration to end of day
    const now = new Date()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const secondsUntilEndOfDay = Math.ceil((endOfDay.getTime() - Date.now()) / 1000)
    await redis.expire(key, secondsUntilEndOfDay)

    return {
      allowed: true,
      current: current + 1,
      limit: maxPerDay,
      remaining: maxPerDay - (current + 1),
      resetAt: endOfDay,
    }
  } catch (error) {
    console.error(`Quota check failed:`, error)
    return {
      allowed: true,
      current: 0,
      limit: maxPerDay,
      remaining: maxPerDay,
      resetAt: new Date(),
    }
  }
}

export interface QuotaResult {
  allowed: boolean
  current: number
  limit: number
  remaining: number
  resetAt: Date
}
