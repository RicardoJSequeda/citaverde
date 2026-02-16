import { Client } from "@upstash/qstash"
import { createServerClient } from "@/lib/supabase/server"

// ==================== QSTASH CLIENT ====================

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN || "",
})

// ==================== NOTIFICATION TYPES ====================

export interface NotificationJob {
  notificationId: string
  userId: string
  type: string
  channel: "email" | "sms" | "push"
  subject: string
  message: string
  appointmentId?: string
  queueTicketId?: string
  metadata?: Record<string, any>
  attempt?: number
  maxAttempts?: number
}

// ==================== QUEUE NOTIFICATION ====================

/**
 * Add notification to queue for async processing
 * Upstash QStash handles retries, scheduling, and delivery
 */
export async function queueNotification(notification: NotificationJob): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!process.env.QSTASH_TOKEN) {
      console.error("QSTASH_TOKEN not configured, falling back to sync processing")
      // Fallback: Try to send synchronously (not ideal but prevents loss)
      return await sendNotificationDirectly(notification)
    }

    const response = await qstash.publishJSON({
      url: `${process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL}/api/notifications/process`,
      body: notification,
      retries: 3, // Automatic retries
      timeout: "30s",
      headers: {
        "x-notification-id": notification.notificationId,
      },
    })

    // Track in database
    const supabase = await createServerClient()
    await supabase
      .from("notifications")
      .update({
        status: "queued",
        queue_message_id: response.messageId,
      })
      .eq("id", notification.notificationId)

    return {
      success: true,
      messageId: response.messageId,
    }
  } catch (error) {
    console.error("Error queuing notification:", error)

    // Mark as failed in database
    const supabase = await createServerClient()
    await supabase
      .from("notifications")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", notification.notificationId)

    // Add to dead letter queue
    await addToDeadLetterQueue(notification, error instanceof Error ? error.message : "Unknown error")

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ==================== SEND NOTIFICATION DIRECTLY ====================

/**
 * Send notification synchronously
 * Fallback for when QStash is not available
 */
async function sendNotificationDirectly(notification: NotificationJob): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabase = await createServerClient()

    // Update status
    await supabase
      .from("notifications")
      .update({ status: "sending" })
      .eq("id", notification.notificationId)

    // Process based on channel
    switch (notification.channel) {
      case "email":
        await sendEmailNotification(notification)
        break
      case "sms":
        await sendSMSNotification(notification)
        break
      case "push":
        await sendPushNotification(notification)
        break
    }

    // Mark as sent
    await supabase
      .from("notifications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", notification.notificationId)

    return { success: true }
  } catch (error) {
    console.error("Error sending notification directly:", error)

    const supabase = await createServerClient()
    await supabase
      .from("notifications")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", notification.notificationId)

    await addToDeadLetterQueue(notification, error instanceof Error ? error.message : "Unknown error")

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ==================== NOTIFICATION PROCESSORS ====================

async function sendEmailNotification(notification: NotificationJob) {
  // TODO: Implement with your email provider (SendGrid, Resend, Mailgun, etc)
  console.log(`[EMAIL] To: ${notification.userId}`, {
    subject: notification.subject,
    message: notification.message,
  })

  // Example with Resend:
  // const response = await resend.emails.send({
  //   from: "noreply@citaverde.com",
  //   to: userEmail,
  //   subject: notification.subject,
  //   html: notification.message,
  // })
}

async function sendSMSNotification(notification: NotificationJob) {
  // TODO: Implement with your SMS provider (Twilio, AWS SNS, etc)
  console.log(`[SMS] To: ${notification.userId}`, {
    message: notification.message,
  })

  // Example with Twilio:
  // await twilio.messages.create({
  //   body: notification.message,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: userPhoneNumber,
  // })
}

async function sendPushNotification(notification: NotificationJob) {
  // TODO: Implement with your push provider (Firebase, OneSignal, etc)
  console.log(`[PUSH] To: ${notification.userId}`, {
    title: notification.subject,
    body: notification.message,
  })

  // Example with Firebase:
  // await firebase.messaging().send({
  //   notification: {
  //     title: notification.subject,
  //     body: notification.message,
  //   },
  //   token: userFCMToken,
  // })
}

// ==================== DEAD LETTER QUEUE ====================

/**
 * Add failed notification to DLQ for manual review
 */
async function addToDeadLetterQueue(notification: NotificationJob, error: string) {
  try {
    const supabase = await createServerClient()

    await supabase.from("notification_dead_letter_queue").insert({
      notification_id: notification.notificationId,
      user_id: notification.userId,
      type: notification.type,
      channel: notification.channel,
      error_message: error,
      payload: JSON.stringify(notification),
      created_at: new Date().toISOString(),
    })

    // Log to monitoring
    console.error(`[DLQ] Notification ${notification.notificationId} added to dead letter queue:`, error)
  } catch (dlqError) {
    console.error("Error adding to dead letter queue:", dlqError)
  }
}

/**
 * Retry failed notifications from DLQ
 * Can be called manually or scheduled
 */
export async function retryDeadLetterQueue() {
  try {
    const supabase = await createServerClient()

    // Get failed notifications from DLQ
    const { data: failedNotifications } = await supabase
      .from("notification_dead_letter_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(100)

    for (const failed of failedNotifications || []) {
      const notification = JSON.parse(failed.payload) as NotificationJob

      // Increment attempts
      await supabase
        .from("notification_dead_letter_queue")
        .update({
          attempts: (failed.attempts || 0) + 1,
        })
        .eq("id", failed.id)

      // Retry
      const result = await queueNotification(notification)

      if (result.success) {
        // Mark as resolved
        await supabase
          .from("notification_dead_letter_queue")
          .update({ status: "resolved", resolved_at: new Date().toISOString() })
          .eq("id", failed.id)
      }
    }

    return { success: true, retried: failedNotifications?.length || 0 }
  } catch (error) {
    console.error("Error retrying dead letter queue:", error)
    return { success: false, error }
  }
}

// ==================== GET QUEUE STATUS ====================

export async function getNotificationStatus(notificationId: string) {
  try {
    const supabase = await createServerClient()

    const { data: notification } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .single()

    return {
      success: true,
      notification,
    }
  } catch (error) {
    console.error("Error getting notification status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
