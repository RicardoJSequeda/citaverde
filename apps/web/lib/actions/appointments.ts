"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getAvailableSlots(professionalId: string, date: string, serviceTypeId: string) {
  const supabase = await createServerClient()

  // Get service duration
  const { data: serviceType } = await supabase
    .from("service_types")
    .select("duration_minutes")
    .eq("id", serviceTypeId)
    .single()

  if (!serviceType) {
    return { error: "Service type not found" }
  }

  // Get professional's schedule for the day
  const dayOfWeek = new Date(date).getDay()
  const { data: schedule } = await supabase
    .from("schedules")
    .select("*")
    .eq("professional_id", professionalId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .single()

  if (!schedule) {
    return { slots: [] }
  }

  // Check for exceptions
  const { data: exception } = await supabase
    .from("schedule_exceptions")
    .select("*")
    .eq("professional_id", professionalId)
    .eq("date", date)
    .single()

  if (exception && !exception.is_available) {
    return { slots: [] }
  }

  // Get existing appointments for the day
  const { data: appointments } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .eq("professional_id", professionalId)
    .eq("appointment_date", date)
    .in("status", ["scheduled", "confirmed", "checked_in", "in_progress"])

  // Generate available slots
  const slots = []
  const startTime = exception?.start_time || schedule.start_time
  const endTime = exception?.end_time || schedule.end_time

  let currentTime = startTime
  const duration = serviceType.duration_minutes

  while (currentTime < endTime) {
    const slotEnd = addMinutes(currentTime, duration)

    if (slotEnd <= endTime) {
      // Check if slot is available
      const isAvailable = !appointments?.some((apt) => {
        return timeOverlaps(currentTime, slotEnd, apt.start_time, apt.end_time)
      })

      if (isAvailable) {
        slots.push(currentTime)
      }
    }

    currentTime = addMinutes(currentTime, duration)
  }

  return { slots }
}

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

  // Get service duration
  const { data: serviceType } = await supabase
    .from("service_types")
    .select("duration_minutes, organization_id")
    .eq("id", formData.serviceTypeId)
    .single()

  if (!serviceType) {
    return { error: "Service type not found" }
  }

  // Calculate end time
  const endTime = addMinutes(formData.startTime, serviceType.duration_minutes)

  // Check availability
  const { data: existingAppointment } = await supabase
    .from("appointments")
    .select("id")
    .eq("professional_id", formData.professionalId)
    .eq("appointment_date", formData.appointmentDate)
    .in("status", ["scheduled", "confirmed", "checked_in", "in_progress"])
    .or(`start_time.lte.${endTime},end_time.gte.${formData.startTime}`)
    .single()

  if (existingAppointment) {
    return { error: "Time slot not available" }
  }

  // Create appointment
  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      organization_id: serviceType.organization_id,
      patient_id: user.id,
      professional_id: formData.professionalId,
      service_type_id: formData.serviceTypeId,
      appointment_date: formData.appointmentDate,
      start_time: formData.startTime,
      end_time: endTime,
      notes: formData.notes,
      status: "scheduled",
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Create confirmation notification
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "appointment_confirmation",
    channel: "email",
    subject: "Appointment Confirmed",
    message: `Your appointment has been scheduled for ${formData.appointmentDate} at ${formData.startTime}`,
    appointment_id: appointment.id,
    status: "pending",
  })

  revalidatePath("/dashboard")
  return { success: true, appointment }
}

export async function cancelAppointment(appointmentId: string, reason: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
    })
    .eq("id", appointmentId)
    .eq("patient_id", user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Create cancellation notification
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "appointment_cancelled",
    channel: "email",
    subject: "Appointment Cancelled",
    message: `Your appointment has been cancelled. Reason: ${reason}`,
    appointment_id: appointmentId,
    status: "pending",
  })

  revalidatePath("/dashboard")
  return { success: true, appointment }
}

export async function checkInAppointment(qrCode: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Find appointment by QR code
  const { data: appointment, error: findError } = await supabase
    .from("appointments")
    .select("*, service_types(name), professionals(name)")
    .eq("qr_code", qrCode)
    .single()

  if (findError || !appointment) {
    return { error: "Invalid QR code" }
  }

  // Verify it's the correct user
  if (appointment.patient_id !== user.id) {
    return { error: "This appointment does not belong to you" }
  }

  // Check if appointment is today
  const today = new Date().toISOString().split("T")[0]
  if (appointment.appointment_date !== today) {
    return { error: "Check-in is only available on the appointment day" }
  }

  // Check if already checked in
  if (appointment.status === "checked_in" || appointment.checked_in_at) {
    return { error: "Already checked in" }
  }

  // Update appointment status
  const { data: updatedAppointment, error: updateError } = await supabase
    .from("appointments")
    .update({
      status: "checked_in",
      checked_in_at: new Date().toISOString(),
    })
    .eq("id", appointment.id)
    .select("*, service_types(name), professionals(name)")
    .single()

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath("/dashboard")
  return { success: true, appointment: updatedAppointment }
}

// Helper functions
function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  const newHours = Math.floor(totalMinutes / 60)
  const newMins = totalMinutes % 60
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`
}

function timeOverlaps(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newStartTime: string,
  token?: string,
) {
  const supabase = await createServerClient()

  // If token provided, verify it (for email link access)
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
  } else {
    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Not authenticated" }
    }
  }

  // Get appointment details
  const { data: appointment } = await supabase
    .from("appointments")
    .select("*, service_types(duration_minutes)")
    .eq("id", appointmentId)
    .single()

  if (!appointment) {
    return { error: "Appointment not found" }
  }

  // Calculate new end time
  const newEndTime = addMinutes(newStartTime, appointment.service_types.duration_minutes)

  // Check availability
  const { data: existingAppointment } = await supabase
    .from("appointments")
    .select("id")
    .eq("professional_id", appointment.professional_id)
    .eq("appointment_date", newDate)
    .neq("id", appointmentId)
    .in("status", ["scheduled", "confirmed", "checked_in", "in_progress"])
    .or(`start_time.lte.${newEndTime},end_time.gte.${newStartTime}`)
    .single()

  if (existingAppointment) {
    return { error: "Time slot not available" }
  }

  // Update appointment
  const { data: updatedAppointment, error } = await supabase
    .from("appointments")
    .update({
      appointment_date: newDate,
      start_time: newStartTime,
      end_time: newEndTime,
      status: "scheduled",
    })
    .eq("id", appointmentId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Send notification
  await supabase.from("notifications").insert({
    user_id: appointment.patient_id,
    type: "appointment_rescheduled",
    channel: "email",
    subject: "Appointment Rescheduled",
    message: `Your appointment has been rescheduled to ${newDate} at ${newStartTime}`,
    appointment_id: appointmentId,
    status: "pending",
  })

  revalidatePath("/dashboard")
  return { success: true, appointment: updatedAppointment }
}

export async function reissueQRCode(appointmentId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Generate new QR code
  const newQRCode = `APT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

  const { data: appointment, error } = await supabase
    .from("appointments")
    .update({
      qr_code: newQRCode,
    })
    .eq("id", appointmentId)
    .eq("patient_id", user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Send notification with new QR
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "qr_reissued",
    channel: "email",
    subject: "New QR Code",
    message: `Your new QR code is: ${newQRCode}`,
    appointment_id: appointmentId,
    status: "pending",
  })

  revalidatePath("/dashboard")
  return { success: true, appointment }
}

export async function rateAppointment(appointmentId: string, rating: number, feedback?: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .update({
      rating,
      feedback,
    })
    .eq("id", appointmentId)
    .eq("patient_id", user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  return { success: true, appointment }
}
