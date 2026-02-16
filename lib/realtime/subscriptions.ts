"use client"

import { RealtimeChannel } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

/**
 * Subscribe to queue updates
 */
export function subscribeToQueueUpdates(
  organizationId: string,
  onUpdate: (payload: any) => void,
  onError?: (error: Error) => void,
): RealtimeChannel | null {
  const supabase = createClient()

  if (!supabase) {
    if (onError) onError(new Error("Supabase client not initialized"))
    return null
  }

  const channel = supabase
    .channel(`queue:${organizationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "queue_tickets",
        filter: `organization_id=eq.${organizationId}`,
      },
      (payload) => {
        onUpdate(payload)
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("Queue subscription active")
      } else if (status === "CHANNEL_ERROR") {
        if (onError) onError(new Error("Channel subscription error"))
      }
    })

  return channel
}

/**
 * Subscribe to appointment updates
 */
export function subscribeToAppointmentUpdates(
  patientId: string,
  onUpdate: (payload: any) => void,
  onError?: (error: Error) => void,
): RealtimeChannel | null {
  const supabase = createClient()

  if (!supabase) {
    if (onError) onError(new Error("Supabase client not initialized"))
    return null
  }

  const channel = supabase
    .channel(`appointments:${patientId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "appointments",
        filter: `patient_id=eq.${patientId}`,
      },
      (payload) => {
        onUpdate(payload)
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("Appointment subscription active")
      } else if (status === "CHANNEL_ERROR") {
        if (onError) onError(new Error("Channel subscription error"))
      }
    })

  return channel
}

/**
 * Subscribe to notification updates
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: any) => void,
  onError?: (error: Error) => void,
): RealtimeChannel | null {
  const supabase = createClient()

  if (!supabase) {
    if (onError) onError(new Error("Supabase client not initialized"))
    return null
  }

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new)
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("Notification subscription active")
      } else if (status === "CHANNEL_ERROR") {
        if (onError) onError(new Error("Channel subscription error"))
      }
    })

  return channel
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribeFromChannel(channel: RealtimeChannel) {
  try {
    await channel.unsubscribe()
  } catch (error) {
    console.error("Error unsubscribing from channel:", error)
  }
}

/**
 * Broadcast a message through a channel
 */
export async function broadcastMessage(
  channel: string,
  event: string,
  message: any,
): Promise<boolean> {
  const supabase = createClient()

  if (!supabase) return false

  try {
    const broadcastChannel = supabase.channel(channel)
    await broadcastChannel.send({
      type: "broadcast",
      event: event,
      payload: message,
    })
    return true
  } catch (error) {
    console.error("Error broadcasting message:", error)
    return false
  }
}
