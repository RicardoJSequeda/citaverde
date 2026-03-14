"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Professionals
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

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Verify admin role
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" }
  }

  // Get organization (for now, use first one)
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

  revalidatePath("/admin/resources")
  return { success: true, professional }
}

export async function deleteProfessional(id: string) {
  const supabase = await createServerClient()

  const { error } = await supabase.from("professionals").delete().eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/resources")
  return { success: true }
}

// Service Types
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

export async function updateServiceType(
  id: string,
  formData: {
    name: string
    description: string
    durationMinutes: number
    color: string
    isActive: boolean
  },
) {
  const supabase = await createServerClient()

  const { data: serviceType, error } = await supabase
    .from("service_types")
    .update({
      name: formData.name,
      description: formData.description,
      duration_minutes: formData.durationMinutes,
      color: formData.color,
      is_active: formData.isActive,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/resources")
  return { success: true, serviceType }
}

export async function closeQueue(serviceTypeId: string, reason: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Verify admin role
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
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

// Departments
export async function createDepartment(formData: {
  name: string
  description: string
}) {
  const supabase = await createServerClient()

  const { data: org } = await supabase.from("organizations").select("id").limit(1).single()

  if (!org) {
    return { error: "No organization found" }
  }

  const { data: department, error } = await supabase
    .from("departments")
    .insert({
      organization_id: org.id,
      name: formData.name,
      description: formData.description,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/resources")
  return { success: true, department }
}

// Rooms
export async function createRoom(formData: {
  name: string
  capacity: number
  departmentId?: string
}) {
  const supabase = await createServerClient()

  const { data: org } = await supabase.from("organizations").select("id").limit(1).single()

  if (!org) {
    return { error: "No organization found" }
  }

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      organization_id: org.id,
      department_id: formData.departmentId,
      name: formData.name,
      capacity: formData.capacity,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/resources")
  return { success: true, room }
}

export async function updateRoom(
  id: string,
  formData: {
    name: string
    capacity: number
    departmentId?: string
    isActive: boolean
  },
) {
  const supabase = await createServerClient()

  const { data: room, error } = await supabase
    .from("rooms")
    .update({
      name: formData.name,
      capacity: formData.capacity,
      department_id: formData.departmentId,
      is_active: formData.isActive,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/resources")
  return { success: true, room }
}

// Schedule Management for Professionals
export async function createSchedule(formData: {
  professionalId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

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

  revalidatePath("/admin/resources")
  return { success: true, schedule }
}

export async function createScheduleException(formData: {
  professionalId: string
  date: string
  isAvailable: boolean
  startTime?: string
  endTime?: string
  reason?: string
}) {
  const supabase = await createServerClient()

  const { data: exception, error } = await supabase
    .from("schedule_exceptions")
    .insert({
      professional_id: formData.professionalId,
      date: formData.date,
      is_available: formData.isAvailable,
      start_time: formData.startTime,
      end_time: formData.endTime,
      reason: formData.reason,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/resources")
  return { success: true, exception }
}

// Notification Template Management
export async function updateNotificationTemplate(
  id: string,
  formData: {
    subject: string
    body: string
  },
) {
  const supabase = await createServerClient()

  const { data: template, error } = await supabase
    .from("notification_templates")
    .update({
      subject: formData.subject,
      body: formData.body,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/settings")
  return { success: true, template }
}

// Queue Configuration
export async function updateQueueConfig(
  serviceTypeId: string,
  formData: {
    priority: number
    isActive: boolean
    maxWaitTime?: number
  },
) {
  const supabase = await createServerClient()

  const { data: serviceType, error } = await supabase
    .from("service_types")
    .update({
      priority: formData.priority,
      is_active: formData.isActive,
      max_wait_time: formData.maxWaitTime,
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

// Check-in Window Configuration
export async function updateCheckInWindow(
  organizationId: string,
  formData: {
    checkInWindowMinutes: number
  },
) {
  const supabase = await createServerClient()

  const { data: org, error } = await supabase
    .from("organizations")
    .update({
      check_in_window_minutes: formData.checkInWindowMinutes,
    })
    .eq("id", organizationId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/settings")
  return { success: true, organization: org }
}

// SLA Configuration
export async function updateServiceSLA(
  serviceTypeId: string,
  formData: {
    targetWaitMinutes: number
  },
) {
  const supabase = await createServerClient()

  const { data: serviceType, error } = await supabase
    .from("service_types")
    .update({
      target_wait_minutes: formData.targetWaitMinutes,
    })
    .eq("id", serviceTypeId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/services")
  return { success: true, serviceType }
}

// Scan Logging with Metadata
export async function logQRScan(formData: {
  qrCode: string
  scanType: "appointment" | "queue"
  ipAddress?: string
  userAgent?: string
  deviceInfo?: string
  success: boolean
  errorMessage?: string
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("qr_scan_logs").insert({
    qr_code: formData.qrCode,
    scan_type: formData.scanType,
    user_id: user?.id,
    ip_address: formData.ipAddress,
    user_agent: formData.userAgent,
    device_info: formData.deviceInfo,
    success: formData.success,
    error_message: formData.errorMessage,
    scanned_at: new Date().toISOString(),
  })

  if (error) {
    console.error("Failed to log QR scan:", error)
  }

  return { success: true }
}

// Performance Comparison Reports
export async function getProfessionalPerformance(startDate: string, endDate: string) {
  const supabase = await createServerClient()

  const { data: professionals, error } = await supabase
    .from("professionals")
    .select(
      `
      id,
      name,
      specialty,
      appointments:appointments(
        id,
        status,
        rating,
        appointment_date,
        start_time,
        end_time,
        checked_in_at,
        completed_at
      )
    `,
    )
    .gte("appointments.appointment_date", startDate)
    .lte("appointments.appointment_date", endDate)

  if (error) {
    return { error: error.message }
  }

  const performance = professionals?.map((prof) => {
    const appointments = prof.appointments || []
    const total = appointments.length
    const completed = appointments.filter((a) => a.status === "completed").length
    const noShow = appointments.filter((a) => a.status === "no_show").length
    const cancelled = appointments.filter((a) => a.status === "cancelled").length
    const avgRating =
      appointments.filter((a) => a.rating).reduce((sum, a) => sum + (a.rating || 0), 0) /
        appointments.filter((a) => a.rating).length || 0

    // Calculate average wait time (check-in to completion)
    const completedWithTimes = appointments.filter((a) => a.checked_in_at && a.completed_at)
    const avgWaitMinutes =
      completedWithTimes.reduce((sum, a) => {
        const checkIn = new Date(a.checked_in_at!).getTime()
        const completed = new Date(a.completed_at!).getTime()
        return sum + (completed - checkIn) / 1000 / 60
      }, 0) / completedWithTimes.length || 0

    return {
      professionalId: prof.id,
      name: prof.name,
      specialty: prof.specialty,
      totalAppointments: total,
      completedAppointments: completed,
      noShowRate: total > 0 ? (noShow / total) * 100 : 0,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
      averageRating: avgRating,
      averageWaitMinutes: avgWaitMinutes,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    }
  })

  return { success: true, performance }
}

// Bottleneck Analysis
export async function getBottleneckAnalysis(startDate: string, endDate: string) {
  const supabase = await createServerClient()

  // Analyze queue tickets by hour and service
  const { data: tickets, error } = await supabase
    .from("queue_tickets")
    .select(
      `
      id,
      created_at,
      called_at,
      completed_at,
      status,
      service_types(name, id)
    `,
    )
    .gte("created_at", startDate)
    .lte("created_at", endDate)

  if (error) {
    return { error: error.message }
  }

  // Group by hour and service
  const hourlyData: Record<string, Record<string, { count: number; avgWaitMinutes: number }>> = {}

  tickets?.forEach((ticket) => {
    const hour = new Date(ticket.created_at).getHours()
    const serviceName = ticket.service_types?.name || "Unknown"

    if (!hourlyData[hour]) {
      hourlyData[hour] = {}
    }

    if (!hourlyData[hour][serviceName]) {
      hourlyData[hour][serviceName] = { count: 0, avgWaitMinutes: 0 }
    }

    hourlyData[hour][serviceName].count++

    if (ticket.called_at) {
      const created = new Date(ticket.created_at).getTime()
      const called = new Date(ticket.called_at).getTime()
      const waitMinutes = (called - created) / 1000 / 60
      hourlyData[hour][serviceName].avgWaitMinutes += waitMinutes
    }
  })

  // Calculate averages
  Object.keys(hourlyData).forEach((hour) => {
    Object.keys(hourlyData[hour]).forEach((service) => {
      const data = hourlyData[hour][service]
      data.avgWaitMinutes = data.avgWaitMinutes / data.count
    })
  })

  return { success: true, bottlenecks: hourlyData }
}

// Digital Adoption Metrics
export async function getDigitalAdoptionMetrics(startDate: string, endDate: string) {
  const supabase = await createServerClient()

  // Count appointments created by users vs staff
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, created_by, patient_id")
    .gte("created_at", startDate)
    .lte("created_at", endDate)

  const digitalAppointments = appointments?.filter((a) => a.created_by === a.patient_id).length || 0
  const manualAppointments = appointments?.filter((a) => a.created_by !== a.patient_id).length || 0
  const totalAppointments = appointments?.length || 0

  // Count queue tickets created digitally
  const { data: tickets } = await supabase
    .from("queue_tickets")
    .select("id, patient_id")
    .gte("created_at", startDate)
    .lte("created_at", endDate)

  const digitalTickets = tickets?.filter((t) => t.patient_id).length || 0
  const manualTickets = tickets?.filter((t) => !t.patient_id).length || 0
  const totalTickets = tickets?.length || 0

  // Estimate paper savings (assuming 1 paper ticket per appointment/queue)
  const totalDigital = digitalAppointments + digitalTickets
  const paperSheetsSaved = totalDigital // 1 sheet per digital transaction
  const co2SavedKg = paperSheetsSaved * 0.005 // ~5g CO2 per sheet

  return {
    success: true,
    metrics: {
      appointments: {
        digital: digitalAppointments,
        manual: manualAppointments,
        total: totalAppointments,
        digitalRate: totalAppointments > 0 ? (digitalAppointments / totalAppointments) * 100 : 0,
      },
      tickets: {
        digital: digitalTickets,
        manual: manualTickets,
        total: totalTickets,
        digitalRate: totalTickets > 0 ? (digitalTickets / totalTickets) * 100 : 0,
      },
      environmental: {
        paperSheetsSaved,
        co2SavedKg: co2SavedKg.toFixed(2),
        treesEquivalent: (paperSheetsSaved / 8333).toFixed(4), // ~8333 sheets per tree
      },
    },
  }
}
