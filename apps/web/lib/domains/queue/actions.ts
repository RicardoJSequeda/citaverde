"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import * as queueService from "./services"

// ==================== CREATE QUEUE TICKET ====================

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

  const result = await queueService.createQueueTicketService(user?.id || null, formData)

  if (result.success) {
    revalidatePath("/dashboard/queue")
  }

  return result
}

// ==================== CALL QUEUE TICKET ====================

export async function callQueueTicket(ticketId: string, roomId?: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const result = await queueService.callQueueTicketService(user.id, ticketId, roomId)

  if (result.success) {
    revalidatePath("/receptionist")
  }

  return result
}

// ==================== COMPLETE QUEUE TICKET ====================

export async function completeQueueTicket(ticketId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const result = await queueService.completeQueueTicketService(user.id, ticketId)

  if (result.success) {
    revalidatePath("/receptionist")
  }

  return result
}

// ==================== MARK NO-SHOW ====================

export async function markQueueTicketNoShow(ticketId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const result = await queueService.markQueueTicketNoShowService(user.id, ticketId)

  if (result.success) {
    revalidatePath("/receptionist")
  }

  return result
}

// ==================== CANCEL QUEUE TICKET ====================

export async function cancelQueueTicket(ticketId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const result = await queueService.cancelQueueTicketService(user.id, ticketId)

  if (result.success) {
    revalidatePath("/dashboard/queue")
  }

  return result
}

// ==================== GET QUEUE POSITION ====================

export async function getQueuePosition(ticketId: string) {
  return queueService.getQueuePositionService(ticketId)
}

// ==================== TRANSFER QUEUE TICKET ====================

export async function transferQueueTicket(ticketId: string, newServiceTypeId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const result = await queueService.transferQueueTicketService(user.id, ticketId, newServiceTypeId)

  if (result.success) {
    revalidatePath("/dashboard/queue")
  }

  return result
}
