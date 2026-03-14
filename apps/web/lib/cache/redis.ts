import { Redis } from "@upstash/redis"

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
})

/**
 * Cache keys generator
 */
export const cacheKeys = {
  // Appointments
  availableSlots: (professionalId: string, date: string) =>
    `slots:${professionalId}:${date}`,
  professionalSchedule: (professionalId: string) =>
    `schedule:${professionalId}`,
  
  // Queue
  queuePosition: (ticketId: string) => `queue:position:${ticketId}`,
  queueWaitTime: (serviceTypeId: string) =>
    `queue:waittime:${serviceTypeId}`,
  activeTickets: (serviceTypeId: string) =>
    `queue:active:${serviceTypeId}`,
  
  // Admin
  adminMetrics: (organizationId: string, date: string) =>
    `admin:metrics:${organizationId}:${date}`,
  serviceStats: (serviceTypeId: string) =>
    `service:stats:${serviceTypeId}`,
}

/**
 * Get cached value
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key)
    return value as T | null
  } catch (error) {
    console.error(`Error reading cache key ${key}:`, error)
    return null
  }
}

/**
 * Set cached value with TTL
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number = 3600, // 1 hour default
): Promise<boolean> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Error setting cache key ${key}:`, error)
    return false
  }
}

/**
 * Delete cache key
 */
export async function deleteCached(key: string): Promise<boolean> {
  try {
    await redis.del(key)
    return true
  } catch (error) {
    console.error(`Error deleting cache key ${key}:`, error)
    return false
  }
}

/**
 * Delete multiple cache keys by pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<boolean> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
    return true
  } catch (error) {
    console.error(`Error invalidating cache pattern ${pattern}:`, error)
    return false
  }
}

/**
 * Increment counter
 */
export async function incrementCounter(key: string, amount: number = 1): Promise<number> {
  try {
    return await redis.incrby(key, amount)
  } catch (error) {
    console.error(`Error incrementing counter ${key}:`, error)
    return 0
  }
}

/**
 * Decrement counter
 */
export async function decrementCounter(key: string, amount: number = 1): Promise<number> {
  try {
    return await redis.decrby(key, amount)
  } catch (error) {
    console.error(`Error decrementing counter ${key}:`, error)
    return 0
  }
}

export default redis
