import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// ==================== SECURITY: Singleton Pattern for Connection Pooling ====================
let cachedClient: ReturnType<typeof createSupabaseServerClient> | null = null

export async function createClient() {
  const cookieStore = await cookies()

  // ✅ SECURITY FIX: ALWAYS use ANON KEY, never bypass RLS
  // Row Level Security policies must be enforced on ALL queries
  // Service Role Key is only for admin operations via separate secure endpoints
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured")
  }

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}

export const createServerClient = createClient

// ==================== ADMIN OPERATIONS: Separate secure client ====================
// For admin-only operations that require service role
export async function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured for admin operations")
  }

  // Admin client with service role - use sparingly and only for admin operations
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey, // Service role only for admins
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // Admin client doesn't use cookies
        },
      },
    },
  )
}
