"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ==================== SEND BULK NOTIFICATION ====================

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

  try {
    let recipients: string[] = []

    if (formData.recipientType === "waiting") {
      const { data: tickets } = await supabase
        .from("queue_tickets")
        .select("patient_id")
        .eq("status", "waiting")
        .not("patient_id", "is", null)

      recipients = tickets?.map((t) => t.patient_id).filter(Boolean) || []
    } else if (formData.recipientType === "scheduled") {
      const today = new Date().toISOString().split("T")[0]
      const { data: appointments } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("appointment_date", today)
        .eq("status", "scheduled")
        .not("patient_id", "is", null)

      recipients = appointments?.map((a) => a.patient_id).filter(Boolean) || []
    }

    // Create notifications
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
  } catch (error) {
    console.error("Error sending bulk notification:", error)
    return { error: "Failed to send bulk notification" }
  }
}

// ==================== GET NOTIFICATIONS ====================

export async function getUserNotifications(limit: number = 10) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  try {
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return { error: error.message }
    }

    return { success: true, notifications }
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return { error: "Failed to fetch notifications" }
  }
}

// ==================== MARK AS READ ====================

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  try {
    const { data: notification, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    return { success: true, notification }
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return { error: "Failed to mark notification as read" }
  }
}

// ==================== DELETE NOTIFICATION ====================

export async function deleteNotification(notificationId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id)

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting notification:", error)
    return { error: "Failed to delete notification" }
  }
}

// ==================== GET UNREAD COUNT ====================

export async function getUnreadNotificationCount() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "only", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)

    if (error) {
      return { error: error.message }
    }

    return { success: true, count: count || 0 }
  } catch (error) {
    console.error("Error getting unread count:", error)
    return { error: "Failed to get unread count" }
  }
}
