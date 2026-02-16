"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import { deleteCached, invalidateCachePattern } from "@/lib/cache/redis"

// ==================== AUTHORIZATION HELPER ====================

async function verifyAdminRole(userId: string) {
  const supabase = await createServerClient()
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single()
  return profile?.role === "admin"
}

// ==================== PROFESSIONALS ====================

export async function createProfessional(formData: {
  name: string
  specialty: string
  licenseNumber: string
  departmentId?: string
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !(await verifyAdminRole(user.id))) {
    return { error: "Unauthorized" }
  }

  const { data: org } = await supabase.from("organizations").select("id").limit(1).single()

  if (!org) {
    return { error: "No organization found" }
  }

  const { data: professional, error } = await supabase
    .from("professionals")
    .insert({
      organization_id: org.id,
      department_id: formData.departmentId,
      name: formData.name,
      specialty: formData.specialty,
      license_number: formData.licenseNumber,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Invalidate schedule cache
  await invalidateCachePattern(`schedule:${professional.id}`)

  revalidatePath("/admin/resources")
  return { success: true, professional }
}

export async function updateProfessional(
  id: string,
  formData: {
    name: string
    specialty: string
    licenseNumber: string
    departmentId?: string
    isActive: boolean
  },
) {
  const supabase = await createServerClient()

  const { data: professional, error } = await supabase
    .from("professionals")
    .update({
      name: formData.name,
      specialty: formData.specialty,
      license_number: formData.licenseNumber,
      department_id: formData.departmentId,
      is_active: formData.isActive,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Invalidate schedule cache
  await invalidateCachePattern(`schedule:${id}`)
  await invalidateCachePattern(`slots:${id}:*`)

  revalidatePath("/admin/resources")
  return { success: true, professional }
}

// ==================== SERVICE TYPES ====================

export async function createServiceType(formData: {
  name: string
  description: string
  durationMinutes: number
  color: string
}) {
  const supabase = await createServerClient()

  const { data: org } = await supabase.from("organizations").select("id").limit(1).single()

  if (!org) {
    return { error: "No organization found" }
  }

  const { data: serviceType, error } = await supabase
    .from("service_types")
    .insert({
      organization_id: org.id,
      name: formData.name,
      description: formData.description,
      duration_minutes: formData.durationMinutes,
      color: formData.color,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/resources")
  return { success: true, serviceType }
}

// ==================== QUEUE MANAGEMENT ====================

export async function closeQueue(serviceTypeId: string, reason: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !(await verifyAdminRole(user.id))) {
    return { error: "Unauthorized" }
  }

  const { data: serviceType, error } = await supabase
    .from("service_types")
    .update({
      is_active: false,
      closure_reason: reason,
      closed_at: new Date().toISOString(),
    })
    .eq("id", serviceTypeId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Invalidate queue cache
  await deleteCached(`queue:active:${serviceTypeId}`)

  // Notify all waiting users
  const { data: waitingTickets } = await supabase
    .from("queue_tickets")
    .select("patient_id")
    .eq("service_type_id", serviceTypeId)
    .eq("status", "waiting")
    .not("patient_id", "is", null)

  if (waitingTickets && waitingTickets.length > 0) {
    const notifications = waitingTickets.map((ticket) => ({
      user_id: ticket.patient_id,
      type: "queue_closed",
      channel: "email",
      subject: "Queue Temporarily Closed",
      message: `The queue has been temporarily closed. Reason: ${reason}`,
      status: "pending",
    }))

    await supabase.from("notifications").insert(notifications)
  }

  revalidatePath("/admin/queues")
  return { success: true, serviceType }
}

export async function reopenQueue(serviceTypeId: string) {
  const supabase = await createServerClient()

  const { data: serviceType, error } = await supabase
    .from("service_types")
    .update({
      is_active: true,
      closure_reason: null,
      closed_at: null,
    })
    .eq("id", serviceTypeId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/queues")
  return { success: true, serviceType }
}

// ==================== SCHEDULE ====================

export async function createSchedule(formData: {
  professionalId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}) {
  const supabase = await createServerClient()

  const { data: schedule, error } = await supabase
    .from("schedules")
    .insert({
      professional_id: formData.professionalId,
      day_of_week: formData.dayOfWeek,
      start_time: formData.startTime,
      end_time: formData.endTime,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Invalidate schedule cache
  await deleteCached(`schedule:${formData.professionalId}`)

  revalidatePath("/admin/resources")
  return { success: true, schedule }
}

// ==================== PERFORMANCE REPORTS ====================

export async function getProfessionalPerformance(startDate: string, endDate: string) {
  const supabase = await createServerClient()

  try {
    const { data: professionals } = await supabase
      .from("professionals")
      .select(
        `
        id,
        name,
        specialty,
        appointments(id, status, rating, appointment_date)
      `,
      )
      .gte("appointments.appointment_date", startDate)
      .lte("appointments.appointment_date", endDate)

    if (!professionals) {
      return { error: "Failed to fetch professionals" }
    }

    const performance = professionals.map((prof) => {
      const appointments = prof.appointments || []
      const total = appointments.length
      const completed = appointments.filter((a) => a.status === "completed").length
      const avgRating =
        appointments.filter((a) => a.rating).reduce((sum, a) => sum + (a.rating || 0), 0) /
          appointments.filter((a) => a.rating).length || 0

      return {
        professionalId: prof.id,
        name: prof.name,
        specialty: prof.specialty,
        totalAppointments: total,
        completedAppointments: completed,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        averageRating: parseFloat(avgRating.toFixed(2)),
      }
    })

    return { success: true, performance }
  } catch (error) {
    console.error("Error getting performance data:", error)
    return { error: "Failed to fetch performance data" }
  }
}
