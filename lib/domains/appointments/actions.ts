"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import * as appointmentService from "./services"
import { checkUserRateLimit } from "@/lib/security/rate-limiting"
import { idempotencyManager } from "@/lib/security/idempotency"
import { executeQuery } from "@/lib/resilience/circuit-breaker"
import { cacheWithTags, cacheStats } from "@/lib/cache/cache-strategy"
import { trackAppointmentEvent, captureException } from "@/lib/monitoring/sentry"

// ==================== GET AVAILABLE SLOTS ====================

export async function getAvailableSlots(
  professionalId: string,
  date: string,
  serviceTypeId: string,
) {
  try {
    // Rate limit (generous for read operations)
    const rateLimitResult = await checkUserRateLimit("anonymous", "getAvailableSlots")
    if (!rateLimitResult.success) {
      return {
        error: "Too many requests. Please try again later.",
        slots: [],
      }
    }

    return await appointmentService.getAvailableSlots(professionalId, date, serviceTypeId)
  } catch (error) {
    captureException(error as Error, {
      professionalId,
      date,
      serviceTypeId,
    })
    return {
      error: "Failed to fetch available slots",
      slots: [],
    }
  }
}

// ==================== CREATE APPOINTMENT ====================

export async function createAppointment(formData: {
  professionalId: string
  serviceTypeId: string
  appointmentDate: string
  startTime: string
  notes?: string
  idempotencyKey?: string
}) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Not authenticated" }
    }

    // ✅ Rate limiting
    const rateLimitResult = await checkUserRateLimit(user.id, "createAppointment")
    if (!rateLimitResult.success) {
      return {
        error: "Too many appointment creation requests. Please try again in a few moments.",
      }
    }

    // ✅ Idempotency - prevent duplicate appointments
    const idempotencyKey = formData.idempotencyKey || `apt:${user.id}:${Date.now()}`
    const existing = await idempotencyManager.checkExists(idempotencyKey)
    if (existing.exists) {
      return { success: true, appointment: existing.result, cached: true }
    }

    // Mark as in-progress to prevent race conditions
    const locked = await idempotencyManager.markInProgress(idempotencyKey)
    if (!locked) {
      return { error: "Appointment creation already in progress" }
    }

    try {
      const result = await appointmentService.createAppointmentService(user.id, formData)

      if (result.success) {
        // ✅ Cache invalidation with tags
        await cacheWithTags.invalidateByTags([
          `slots:${formData.professionalId}:${formData.appointmentDate}`,
          `professional:${formData.professionalId}`,
        ])

        // Store result for idempotency
        await idempotencyManager.storeResult(idempotencyKey, result.appointment)

        // Track event for monitoring
        trackAppointmentEvent("create", result.appointment.id)

        revalidatePath("/dashboard")
      }

      return result
    } catch (error) {
      // Clean up lock on error
      await idempotencyManager.clear(idempotencyKey)
      throw error
    }
  } catch (error) {
    captureException(error as Error, {
      action: "createAppointment",
      formData,
    })
    return { error: "Failed to create appointment" }
  }
}

// ==================== CANCEL APPOINTMENT ====================

export async function cancelAppointment(appointmentId: string, reason: string) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Not authenticated" }
    }

    // ✅ Rate limiting
    const rateLimitResult = await checkUserRateLimit(user.id, "cancelAppointment")
    if (!rateLimitResult.success) {
      return { error: "Too many cancellation requests. Please try again later." }
    }

    const result = await appointmentService.cancelAppointmentService(appointmentId, user.id, reason)

    if (result.success) {
      // Invalidate cache
      await cacheWithTags.invalidateByTag(`appointment:${appointmentId}`)
      trackAppointmentEvent("cancel", appointmentId)
      revalidatePath("/dashboard")
    }

    return result
  } catch (error) {
    captureException(error as Error, { appointmentId, action: "cancelAppointment" })
    return { error: "Failed to cancel appointment" }
  }
}

// ==================== CHECK-IN APPOINTMENT ====================

export async function checkInAppointment(qrCode: string) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Not authenticated" }
    }

    const result = await appointmentService.checkInAppointmentService(qrCode, user.id)

    if (result.success) {
      trackAppointmentEvent("checkin", result.appointment.id)
      revalidatePath("/dashboard")
    }

    return result
  } catch (error) {
    captureException(error as Error, { qrCode, action: "checkInAppointment" })
    return { error: "Failed to check in" }
  }
}

// ==================== RESCHEDULE APPOINTMENT ====================

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newStartTime: string,
  token?: string,
) {
  try {
    const supabase = await createServerClient()

    let userId: string

    if (token) {
      const { data: appointment } = await supabase
        .from("appointments")
        .select("id, patient_id")
        .eq("id", appointmentId)
        .eq("reschedule_token", token)
        .single()

      if (!appointment) {
        return { error: "Invalid or expired link" }
      }

      userId = appointment.patient_id
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return { error: "Not authenticated" }
      }

      userId = user.id

      // Rate limiting
      const rateLimitResult = await checkUserRateLimit(userId, "createAppointment")
      if (!rateLimitResult.success) {
        return { error: "Too many reschedule requests. Please try again later." }
      }
    }

    const result = await appointmentService.rescheduleAppointmentService(
      appointmentId,
      userId,
      newDate,
      newStartTime,
    )

    if (result.success) {
      await cacheWithTags.invalidateByTag(`appointment:${appointmentId}`)
      trackAppointmentEvent("reschedule", appointmentId)
      revalidatePath("/dashboard")
    }

    return result
  } catch (error) {
    captureException(error as Error, { appointmentId, action: "rescheduleAppointment" })
    return { error: "Failed to reschedule appointment" }
  }
}

// ==================== REISSUE QR CODE ====================

export async function reissueQRCode(appointmentId: string) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Not authenticated" }
    }

    const result = await appointmentService.reissueQRCodeService(appointmentId, user.id)

    if (result.success) {
      trackAppointmentEvent("create", appointmentId)
      revalidatePath("/dashboard")
    }

    return result
  } catch (error) {
    captureException(error as Error, { appointmentId, action: "reissueQRCode" })
    return { error: "Failed to reissue QR code" }
  }
}

// ==================== RATE APPOINTMENT ====================

export async function rateAppointment(appointmentId: string, rating: number, feedback?: string) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Not authenticated" }
    }

    const result = await appointmentService.rateAppointmentService(appointmentId, user.id, rating, feedback)

    if (result.success) {
      revalidatePath("/dashboard")
    }

    return result
  } catch (error) {
    captureException(error as Error, { appointmentId, action: "rateAppointment" })
    return { error: "Failed to rate appointment" }
  }
}
