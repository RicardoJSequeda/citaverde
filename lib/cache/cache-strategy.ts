import { Redis } from "@upstash/redis"
import { getCached, setCached, deleteCached, incrementCounter } from "./redis"

// ==================== REDIS CLIENT ====================

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
})

// ==================== CACHE TAGS ====================

/**
 * Cache with tag-based invalidation
 * Allows invalidating multiple cache entries at once
 */
export class CacheWithTags {
  /**
   * Set cached value with tags
   * Tags allow bulk invalidation of related cache entries
   */
  async setWithTags<T>(
    key: string,
    value: T,
    tags: string[],
    ttlSeconds: number = 3600,
  ): Promise<boolean> {
    try {
      // Set main cache entry
      await setCached(key, value, ttlSeconds)

      // Register tags for this key
      for (const tag of tags) {
        const tagKey = `cache:tag:${tag}`
        await redis.sadd(tagKey, key)
        // Tag expires after 7 days
        await redis.expire(tagKey, 604800)
      }

      // Log invalidation for audit trail
      await redis.xadd("cache:audit", "*", {
        action: "SET",
        key,
        tags: tags.join(","),
        timestamp: new Date().toISOString(),
      })

      return true
    } catch (error) {
      console.error(`Error setting cache with tags:`, error)
      return false
    }
  }

  /**
   * Invalidate all cache entries with specific tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const tagKey = `cache:tag:${tag}`
      const keys = await redis.smembers(tagKey)

      if (!keys || keys.length === 0) {
        return 0
      }

      // Delete all tagged keys
      for (const key of keys) {
        await deleteCached(key as string)
      }

      // Clear tag set
      await redis.del(tagKey)

      // Log invalidation
      await redis.xadd("cache:audit", "*", {
        action: "INVALIDATE_TAG",
        tag,
        keysDeleted: keys.length,
        timestamp: new Date().toISOString(),
      })

      return keys.length
    } catch (error) {
      console.error(`Error invalidating by tag:`, error)
      return 0
    }
  }

  /**
   * Invalidate multiple tags at once
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0

    for (const tag of tags) {
      const count = await this.invalidateByTag(tag)
      totalInvalidated += count
    }

    return totalInvalidated
  }

  /**
   * Get all keys for a tag (for debugging)
   */
  async getKeysByTag(tag: string): Promise<string[]> {
    try {
      const tagKey = `cache:tag:${tag}`
      const keys = await redis.smembers(tagKey)
      return (keys || []) as string[]
    } catch (error) {
      console.error(`Error getting keys by tag:`, error)
      return []
    }
  }
}

// ==================== CACHE VERSIONING ====================

/**
 * Version-based cache invalidation
 * When you need to invalidate cache without regex patterns
 */
export class CacheVersion {
  /**
   * Increment cache version (invalidates all cached entries for this prefix)
   */
  async invalidateVersion(prefix: string): Promise<number> {
    try {
      const versionKey = `cache:version:${prefix}`
      const newVersion = await redis.incr(versionKey)

      // Log invalidation
      await redis.xadd("cache:audit", "*", {
        action: "INVALIDATE_VERSION",
        prefix,
        version: newVersion,
        timestamp: new Date().toISOString(),
      })

      return newVersion
    } catch (error) {
      console.error(`Error invalidating version:`, error)
      return 0
    }
  }

  /**
   * Get current version
   */
  async getVersion(prefix: string): Promise<number> {
    try {
      const versionKey = `cache:version:${prefix}`
      const version = await redis.get<number>(versionKey)
      return version || 0
    } catch (error) {
      console.error(`Error getting version:`, error)
      return 0
    }
  }

  /**
   * Build cache key with version
   */
  async buildVersionedKey(prefix: string, key: string): Promise<string> {
    const version = await this.getVersion(prefix)
    return `${prefix}:v${version}:${key}`
  }
}

// ==================== CACHE STATISTICS ====================

export class CacheStats {
  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hits: number
    misses: number
    evictions: number
    hitRate: number
  }> {
    try {
      const hits = (await redis.get<number>("cache:stats:hits")) || 0
      const misses = (await redis.get<number>("cache:stats:misses")) || 0
      const evictions = (await redis.get<number>("cache:stats:evictions")) || 0

      const total = hits + misses
      const hitRate = total > 0 ? (hits / total) * 100 : 0

      return {
        hits,
        misses,
        evictions,
        hitRate: parseFloat(hitRate.toFixed(2)),
      }
    } catch (error) {
      console.error(`Error getting cache stats:`, error)
      return {
        hits: 0,
        misses: 0,
        evictions: 0,
        hitRate: 0,
      }
    }
  }

  /**
   * Record cache hit
   */
  async recordHit(): Promise<void> {
    try {
      await incrementCounter("cache:stats:hits")
    } catch (error) {
      console.error(`Error recording cache hit:`, error)
    }
  }

  /**
   * Record cache miss
   */
  async recordMiss(): Promise<void> {
    try {
      await incrementCounter("cache:stats:misses")
    } catch (error) {
      console.error(`Error recording cache miss:`, error)
    }
  }

  /**
   * Clear statistics
   */
  async clearStats(): Promise<boolean> {
    try {
      await redis.del("cache:stats:hits")
      await redis.del("cache:stats:misses")
      await redis.del("cache:stats:evictions")
      return true
    } catch (error) {
      console.error(`Error clearing stats:`, error)
      return false
    }
  }
}

// ==================== SMART CACHE WRAPPER ====================

/**
 * Get cached value with automatic miss tracking
 */
export async function getCachedWithStats<T>(
  key: string,
  stats: CacheStats,
): Promise<T | null> {
  const value = await getCached<T>(key)

  if (value) {
    await stats.recordHit()
  } else {
    await stats.recordMiss()
  }

  return value
}

// ==================== SINGLETON INSTANCES ====================

export const cacheWithTags = new CacheWithTags()
export const cacheVersion = new CacheVersion()
export const cacheStats = new CacheStats()

// ==================== CACHE AUDIT LOG ====================

/**
 * Get cache audit trail
 */
export async function getCacheAuditLog(limit: number = 100): Promise<any[]> {
  try {
    const messages = await redis.xrange("cache:audit", "-", "+", {
      count: limit,
    })
    return messages || []
  } catch (error) {
    console.error(`Error getting audit log:`, error)
    return []
  }
}

/**
 * Clear audit log
 */
export async function clearCacheAuditLog(): Promise<boolean> {
  try {
    await redis.del("cache:audit")
    return true
  } catch (error) {
    console.error(`Error clearing audit log:`, error)
    return false
  }
}

// ==================== CACHE HEALTH CHECK ====================

/**
 * Perform health check on cache layer
 */
export async function cacheHealthCheck(): Promise<{
  healthy: boolean
  latencyMs: number
  error?: string
}> {
  try {
    const start = Date.now()
    const testKey = "cache:health:check"

    // Write
    await setCached(testKey, { timestamp: Date.now() }, 60)

    // Read
    const value = await getCached(testKey)

    // Delete
    await deleteCached(testKey)

    const latencyMs = Date.now() - start

    return {
      healthy: !!value,
      latencyMs,
    }
  } catch (error) {
    return {
      healthy: false,
      latencyMs: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
