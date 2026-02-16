import CircuitBreaker from "opossum"
import { createServerClient } from "@/lib/supabase/server"
import { getCached, setCached, cacheKeys } from "@/lib/cache/redis"

// ==================== CIRCUIT BREAKER CONFIGURATION ====================

const circuitBreakerConfig = {
  timeout: 30000, // 30 seconds
  errorThresholdPercentage: 50, // Trip if 50% of requests fail
  resetTimeout: 60000, // Try again after 60 seconds
  name: "supabase",
  healthCheckInterval: 10000, // Check health every 10 seconds
  fallback: fallbackHandler,
  healthCheck: async () => {
    try {
      const supabase = await createServerClient()
      await supabase.from("profiles").select("id").limit(1)
      return true
    } catch (error) {
      console.error("Circuit breaker health check failed:", error)
      return false
    }
  },
}

// ==================== CREATE CIRCUIT BREAKERS ====================

export const supabaseBreaker = new CircuitBreaker(executeWithFallback, circuitBreakerConfig)

// ==================== FALLBACK HANDLER ====================

async function fallbackHandler(error: Error, operation: string, ...args: any[]): Promise<any> {
  console.warn(
    `[CIRCUIT BREAKER] Fallback triggered for operation: ${operation}`,
    error.message,
  )

  // Try to return cached data
  if (args.length > 0 && typeof args[0] === "string") {
    const cacheKey = args[0]
    const cached = await getCached(cacheKey)
    if (cached) {
      console.log(`[FALLBACK] Returning cached data for ${cacheKey}`)
      return cached
    }
  }

  // Return graceful empty response
  return {
    data: null,
    error: {
      message: "Service temporarily unavailable. Please try again.",
      code: "SERVICE_UNAVAILABLE",
    },
  }
}

// ==================== EXECUTE WITH FALLBACK ====================

async function executeWithFallback(
  operation: (supabase: any) => Promise<any>,
  cacheKey?: string,
  cacheTTL?: number,
): Promise<any> {
  const supabase = await createServerClient()

  try {
    const result = await operation(supabase)

    // Cache successful result if cache key provided
    if (cacheKey && result.data) {
      await setCached(cacheKey, result.data, cacheTTL || 3600)
    }

    return result
  } catch (error) {
    // Try to return cached data
    if (cacheKey) {
      const cached = await getCached(cacheKey)
      if (cached) {
        console.log(`[CACHED FALLBACK] Returning stale data for ${cacheKey}`)
        return { data: cached, error: null }
      }
    }

    throw error
  }
}

// ==================== PROTECTED OPERATIONS ====================

/**
 * Execute query with circuit breaker protection
 */
export async function executeQuery<T>(
  operation: (supabase: any) => Promise<{ data: T; error: any }>,
  options?: {
    cacheKey?: string
    cacheTTL?: number
  },
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await supabaseBreaker.fire(
      executeWithFallback,
      options?.cacheKey,
      options?.cacheTTL,
    )

    if (!result) {
      return { data: null, error: "Operation failed" }
    }

    return result
  } catch (error) {
    console.error("Circuit breaker error:", error)
    return {
      data: null,
      error: {
        message: "Service temporarily unavailable",
        code: "SERVICE_UNAVAILABLE",
      },
    }
  }
}

// ==================== CIRCUIT BREAKER STATUS ====================

export interface CircuitBreakerStatus {
  state: "CLOSED" | "OPEN" | "HALF_OPEN"
  successCount: number
  failureCount: number
  nextAttempt?: number
}

export function getCircuitBreakerStatus(): CircuitBreakerStatus {
  const stats = supabaseBreaker.stats
  return {
    state: supabaseBreaker.opened ? "OPEN" : supabaseBreaker.halfOpen ? "HALF_OPEN" : "CLOSED",
    successCount: stats.successes || 0,
    failureCount: stats.failures || 0,
    nextAttempt: supabaseBreaker.opened
      ? Date.now() + circuitBreakerConfig.resetTimeout
      : undefined,
  }
}

// ==================== MONITORING ====================

supabaseBreaker.on("open", () => {
  console.error("[CIRCUIT BREAKER] OPENED - Service unavailable")
})

supabaseBreaker.on("halfOpen", () => {
  console.warn("[CIRCUIT BREAKER] HALF-OPEN - Testing service recovery")
})

supabaseBreaker.on("close", () => {
  console.info("[CIRCUIT BREAKER] CLOSED - Service recovered")
})

supabaseBreaker.on("fallback", (result) => {
  console.warn("[CIRCUIT BREAKER] Fallback activated, returning cached data")
})

supabaseBreaker.on("failure", (error) => {
  console.error("[CIRCUIT BREAKER] Failure:", error.message)
})

supabaseBreaker.on("success", () => {
  console.debug("[CIRCUIT BREAKER] Success")
})

// ==================== RESET CIRCUIT BREAKER ====================

export function resetCircuitBreaker() {
  supabaseBreaker.close()
  console.info("[CIRCUIT BREAKER] Manually reset")
}

// ==================== EXPORT STATS ====================

export function getCircuitBreakerStats() {
  return {
    state: supabaseBreaker.opened ? "OPEN" : supabaseBreaker.halfOpen ? "HALF_OPEN" : "CLOSED",
    stats: supabaseBreaker.stats,
    health: supabaseBreaker.health,
  }
}
