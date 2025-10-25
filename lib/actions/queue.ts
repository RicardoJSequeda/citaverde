"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createQueueTicket(formData: {
  serviceTypeId: string
  departmentId?: string
  patientName?: string
  patientPhone?: string
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get service type info
  const { data: serviceType } = await supabase
    .from("service_types")
    .select("organization_id")
    .eq("id", formData.serviceTypeId)
    .single()

  if (!serviceType) {
    return { error: "Service type not found" }
  }

  // Get user profile if authenticated
  let patientName = formData.patientName
  let patientPhone = formData.patientPhone

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single()

    if (profile) {
      patientName = profile.full_name
      patientPhone = profile.phone
    }
  }

  // Create queue ticket
  const { data: ticket, error } = await supabase
    .from("queue_tickets")
    .insert({
      organization_id: serviceType.organization_id,
      department_id: formData.departmentId,
      service_type_id: formData.serviceTypeId,
      patient_id: user?.id,
      patient_name: patientName,
      patient_phone: patientPhone,
      status: "waiting",
    })
    .select("*, service_types(name, color)")
    .single()

  if (error) {
    return { error: error.message }
  }

  // Create notification if user is authenticated
  if (user) {
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "queue_ready",
      channel: "email",
      subject: "Queue Ticket Created",
      message: `Your ticket ${ticket.ticket_code} has been created. Please wait to be called.`,
      queue_ticket_id: ticket.id,
      status: "pending",
    })
  }

  revalidatePath("/dashboard/queue")
  return { success: true, ticket }
}

export async function callQueueTicket(ticketId: string, roomId?: string) {
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

  // Update ticket status
  const { data: ticket, error } = await supabase
    .from("queue_tickets")
    .update({
      status: "called",
      called_at: new Date().toISOString(),
      room_id: roomId,
    })
    .eq("id", ticketId)
    .select("*, service_types(name), rooms(name)")
    .single()

  if (error) {
    return { error: error.message }
  }

  // Create notification if patient is registered
  if (ticket.patient_id) {
    await supabase.from("notifications").insert({
      user_id: ticket.patient_id,
      type: "queue_called",
      channel: "email",
      subject: "Your Turn",
      message: `Ticket ${ticket.ticket_code} is being called. Please proceed to ${ticket.rooms?.name || "the reception desk"}.`,
      queue_ticket_id: ticket.id,
      status: "pending",
    })
  }

  revalidatePath("/receptionist")
  return { success: true, ticket }
}

export async function completeQueueTicket(ticketId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: ticket, error } = await supabase
    .from("queue_tickets")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/receptionist")
  return { success: true, ticket }
}

export async function markQueueTicketNoShow(ticketId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: ticket, error } = await supabase
    .from("queue_tickets")
    .update({
      status: "no_show",
    })
    .eq("id", ticketId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/receptionist")
  return { success: true, ticket }
}

export async function cancelQueueTicket(ticketId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: ticket, error } = await supabase
    .from("queue_tickets")
    .update({
      status: "cancelled",
    })
    .eq("id", ticketId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard/queue")
  return { success: true, ticket }
}

export async function getQueuePosition(ticketId: string) {
  const supabase = await createServerClient()

  const { data: ticket } = await supabase
    .from("queue_tickets")
    .select("*, service_types(duration_minutes)")
    .eq("id", ticketId)
    .single()

  if (!ticket) {
    return { error: "Ticket not found" }
  }

  // Count tickets ahead in queue
  const { count } = await supabase
    .from("queue_tickets")
    .select("*", { count: "only", head: true })
    .eq("service_type_id", ticket.service_type_id)
    .eq("status", "waiting")
    .lt("ticket_number", ticket.ticket_number)

  const position = (count || 0) + 1
  const estimatedWaitMinutes = position * (ticket.service_types?.duration_minutes || 15)

  return {
    success: true,
    position,
    estimatedWaitMinutes,
    ticketsAhead: count || 0,
  }
}

export async function transferQueueTicket(ticketId: string, newServiceTypeId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Verify ticket belongs to user
  const { data: ticket } = await supabase
    .from("queue_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("patient_id", user.id)
    .single()

  if (!ticket) {
    return { error: "Ticket not found or unauthorized" }
  }

  // Update ticket with new service type
  const { data: updatedTicket, error } = await supabase
    .from("queue_tickets")
    .update({
      service_type_id: newServiceTypeId,
      status: "waiting",
    })
    .eq("id", ticketId)
    .select("*, service_types(name)")
    .single()

  if (error) {
    return { error: error.message }
  }

  // Send notification
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "queue_transferred",
    channel: "email",
    subject: "Queue Transfer",
    message: `Your ticket has been transferred to ${updatedTicket.service_types?.name}`,
    queue_ticket_id: ticketId,
    status: "pending",
  })

  revalidatePath("/dashboard/queue")
  return { success: true, ticket: updatedTicket }
}
