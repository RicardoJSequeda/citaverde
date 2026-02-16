"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import * as appointmentService from "./services"

// ==================== GET AVAILABLE SLOTS ====================

export async function getAvailableSlots(professionalId: string, date: string, serviceTypeId: string) {
  return appointmentService.getAvailableSlots(professionalId, date, serviceTypeId)
}

// ==================== CREATE APPOINTMENT ====================

export async function createAppointment(formData: {
  professionalId: string
  serviceTypeId: string
  appointmentDate: string
  startTime: string
  notes?: string
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const result = await appointmentService.createAppointmentService(user.id, formData)

  if (result.success) {
    revalidatePath("/dashboard")
  }

  return result
}

// ==================== CANCEL APPOINTMENT ====================

export async function cancelAppointment(appointmentId: string, reason: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const result = await appointmentService.cancelAppointmentService(appointmentId, user.id, reason)

  if (result.success) {
    revalidatePath("/dashboard")
  }

  return result
}

// ==================== CHECK-IN APPOINTMENT ====================

export async function checkInAppointment(qrCode: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const result = await appointmentService.checkInAppointmentService(qrCode, user.id)

  if (result.success) {
    revalidatePath("/dashboard")
  }

  return result
}

// ==================== RESCHEDULE APPOINTMENT ====================

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newStartTime: string,
  token?: string,
) {
  const supabase = await createServerClient()

  let userId: string

  if (token) {
    // Verify token (for email link access)
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
  }

  const result = await appointmentService.rescheduleAppointmentService(
    appointmentId,
    userId,
    newDate,
    newStartTime,
  )

  if (result.success) {
    revalidatePath("/dashboard")
  }

  return result
}

// ==================== REISSUE QR CODE ====================

export async function reissueQRCode(appointmentId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const result = await appointmentService.reissueQRCodeService(appointmentId, user.id)

  if (result.success) {
    revalidatePath("/dashboard")
  }

  return result
}

// ==================== RATE APPOINTMENT ====================

export async function rateAppointment(appointmentId: string, rating: number, feedback?: string) {
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
}
