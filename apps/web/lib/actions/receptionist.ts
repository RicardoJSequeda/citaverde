"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createManualAppointment(formData: {
  patientName: string
  patientEmail?: string
  patientPhone?: string
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

  // Verify user is staff
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || !["admin", "receptionist"].includes(profile.role)) {
    return { error: "Unauthorized" }
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

  // Create appointment
  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      organization_id: serviceType.organization_id,
      professional_id: formData.professionalId,
      service_type_id: formData.serviceTypeId,
      appointment_date: formData.appointmentDate,
      start_time: formData.startTime,
      end_time: endTime,
      notes: formData.notes,
      status: "scheduled",
      created_by: user.id,
      patient_name: formData.patientName,
      patient_email: formData.patientEmail,
      patient_phone: formData.patientPhone,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/receptionist")
  return { success: true, appointment }
}

export async function sendBulkNotification(formData: {
  subject: string
  message: string
  recipientType: "all" | "waiting" | "scheduled"
  serviceTypeId?: string
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Verify user is staff
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || !["admin", "receptionist"].includes(profile.role)) {
    return { error: "Unauthorized" }
  }

  let recipients: string[] = []

  if (formData.recipientType === "waiting") {
    // Get all users with waiting tickets
    const { data: tickets } = await supabase
      .from("queue_tickets")
      .select("patient_id")
      .eq("status", "waiting")
      .not("patient_id", "is", null)

    recipients = tickets?.map((t) => t.patient_id).filter(Boolean) || []
  } else if (formData.recipientType === "scheduled") {
    // Get all users with scheduled appointments today
    const today = new Date().toISOString().split("T")[0]
    const { data: appointments } = await supabase
      .from("appointments")
      .select("patient_id")
      .eq("appointment_date", today)
      .eq("status", "scheduled")
      .not("patient_id", "is", null)

    recipients = appointments?.map((a) => a.patient_id).filter(Boolean) || []
  }

  // Create notifications for all recipients
  const notifications = recipients.map((userId) => ({
    user_id: userId,
    type: "bulk_message",
    channel: "email",
    subject: formData.subject,
    message: formData.message,
    status: "pending",
  }))

  const { error } = await supabase.from("notifications").insert(notifications)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/receptionist")
  return { success: true, count: recipients.length }
}

function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  const newHours = Math.floor(totalMinutes / 60)
  const newMins = totalMinutes % 60
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`
}
