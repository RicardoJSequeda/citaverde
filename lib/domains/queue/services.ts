import { createServerClient } from "@/lib/supabase/server"
import { 
  cacheKeys, 
  getCached, 
  setCached, 
  deleteCached, 
  incrementCounter, 
  decrementCounter 
} from "@/lib/cache/redis"

// ==================== CREATE QUEUE TICKET ====================

export async function createQueueTicketService(
  userId: string | null,
  formData: {
    serviceTypeId: string
    departmentId?: string
    patientName?: string
    patientPhone?: string
  },
) {
  try {
    const supabase = await createServerClient()

    // Get service type info
    const { data: serviceType } = await supabase
      .from("service_types")
      .select("organization_id")
      .eq("id", formData.serviceTypeId)
      .single()

    if (!serviceType) {
      return { error: "Service type not found" }
    }

    let patientName = formData.patientName
    let patientPhone = formData.patientPhone

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId)
        .single()

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
        patient_id: userId,
        patient_name: patientName,
        patient_phone: patientPhone,
        status: "waiting",
      })
      .select("*, service_types(name, color)")
      .single()

    if (error) {
      return { error: error.message }
    }

    // Invalidate queue cache
    await deleteCached(cacheKeys.activeTickets(formData.serviceTypeId))

    // Queue notification
    if (userId) {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "queue_ready",
        channel: "email",
        subject: "Queue Ticket Created",
        message: `Your ticket ${ticket.ticket_code} has been created. Please wait to be called.`,
        queue_ticket_id: ticket.id,
        status: "pending",
      })
    }

    return { success: true, ticket }
  } catch (error) {
    console.error("Error creating queue ticket:", error)
    return { error: "Failed to create queue ticket" }
  }
}

// ==================== CALL QUEUE TICKET ====================

export async function callQueueTicketService(
  userId: string,
  ticketId: string,
  roomId?: string,
) {
  try {
    const supabase = await createServerClient()

    // Verify user is staff
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

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

    // Invalidate queue cache
    await deleteCached(cacheKeys.activeTickets(ticket.service_type_id))

    // Notify patient if registered
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

    return { success: true, ticket }
  } catch (error) {
    console.error("Error calling queue ticket:", error)
    return { error: "Failed to call queue ticket" }
  }
}

// ==================== COMPLETE QUEUE TICKET ====================

export async function completeQueueTicketService(userId: string, ticketId: string) {
  try {
    const supabase = await createServerClient()

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

    // Invalidate queue cache
    await deleteCached(cacheKeys.activeTickets(ticket.service_type_id))

    return { success: true, ticket }
  } catch (error) {
    console.error("Error completing queue ticket:", error)
    return { error: "Failed to complete queue ticket" }
  }
}

// ==================== MARK NO-SHOW ====================

export async function markQueueTicketNoShowService(userId: string, ticketId: string) {
  try {
    const supabase = await createServerClient()

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

    // Invalidate queue cache
    await deleteCached(cacheKeys.activeTickets(ticket.service_type_id))

    return { success: true, ticket }
  } catch (error) {
    console.error("Error marking no-show:", error)
    return { error: "Failed to mark no-show" }
  }
}

// ==================== CANCEL QUEUE TICKET ====================

export async function cancelQueueTicketService(userId: string, ticketId: string) {
  try {
    const supabase = await createServerClient()

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

    // Invalidate queue cache
    await deleteCached(cacheKeys.activeTickets(ticket.service_type_id))

    return { success: true, ticket }
  } catch (error) {
    console.error("Error cancelling queue ticket:", error)
    return { error: "Failed to cancel queue ticket" }
  }
}

// ==================== GET QUEUE POSITION ====================

export async function getQueuePositionService(ticketId: string) {
  try {
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
  } catch (error) {
    console.error("Error getting queue position:", error)
    return { error: "Failed to get queue position" }
  }
}

// ==================== TRANSFER QUEUE TICKET ====================

export async function transferQueueTicketService(
  userId: string,
  ticketId: string,
  newServiceTypeId: string,
) {
  try {
    const supabase = await createServerClient()

    // Verify ticket belongs to user
    const { data: ticket } = await supabase
      .from("queue_tickets")
      .select("*")
      .eq("id", ticketId)
      .eq("patient_id", userId)
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

    // Invalidate old and new queue caches
    await deleteCached(cacheKeys.activeTickets(ticket.service_type_id))
    await deleteCached(cacheKeys.activeTickets(newServiceTypeId))

    // Send notification
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "queue_transferred",
      channel: "email",
      subject: "Queue Transfer",
      message: `Your ticket has been transferred to ${updatedTicket.service_types?.name}`,
      queue_ticket_id: ticketId,
      status: "pending",
    })

    return { success: true, ticket: updatedTicket }
  } catch (error) {
    console.error("Error transferring queue ticket:", error)
    return { error: "Failed to transfer queue ticket" }
  }
}
