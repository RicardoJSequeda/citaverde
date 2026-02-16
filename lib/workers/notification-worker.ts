import Queue, { Queue as BullQueue } from "bull"
import { createServerClient } from "@/lib/supabase/server"

// ==================== QUEUE SETUP ====================

const notificationQueue: BullQueue = new Queue("notifications", {
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
})

// ==================== NOTIFICATION INTERFACE ====================

interface NotificationJob {
  notificationId: string
  userId: string
  type: string
  channel: "email" | "sms" | "push"
  subject: string
  message: string
  appointmentId?: string
  queueTicketId?: string
}

// ==================== PROCESS NOTIFICATIONS ====================

notificationQueue.process(async (job) => {
  const notification: NotificationJob = job.data

  try {
    // Update notification status to 'sending'
    const supabase = await createServerClient()

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
    console.error(`Error processing notification ${notification.notificationId}:`, error)

    // Mark as failed
    const supabase = await createServerClient()
    await supabase
      .from("notifications")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", notification.notificationId)

    throw error
  }
})

// ==================== EMAIL NOTIFICATION ====================

async function sendEmailNotification(notification: NotificationJob) {
  // TODO: Implement email sending using your preferred provider
  // Examples: SendGrid, Resend, AWS SES, etc.

  console.log(`Sending email to user ${notification.userId}:`, {
    subject: notification.subject,
    message: notification.message,
  })

  // Simulated delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // In production:
  // await sendEmailProvider.send({
  //   to: userEmail,
  //   subject: notification.subject,
  //   body: notification.message
  // })
}

// ==================== SMS NOTIFICATION ====================

async function sendSMSNotification(notification: NotificationJob) {
  // TODO: Implement SMS sending using your preferred provider
  // Examples: Twilio, AWS SNS, etc.

  console.log(`Sending SMS to user ${notification.userId}:`, {
    message: notification.message,
  })

  // Simulated delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // In production:
  // await smsProvider.send({
  //   to: userPhoneNumber,
  //   message: notification.message
  // })
}

// ==================== PUSH NOTIFICATION ====================

async function sendPushNotification(notification: NotificationJob) {
  // TODO: Implement push notifications using your preferred provider
  // Examples: Firebase, OneSignal, etc.

  console.log(`Sending push notification to user ${notification.userId}:`, {
    subject: notification.subject,
    message: notification.message,
  })

  // Simulated delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // In production:
  // await pushProvider.send({
  //   userId: notification.userId,
  //   title: notification.subject,
  //   body: notification.message
  // })
}

// ==================== QUEUE NOTIFICATION ====================

export async function queueNotification(notification: NotificationJob) {
  try {
    await notificationQueue.add(notification, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
    })

    return { success: true }
  } catch (error) {
    console.error("Error queuing notification:", error)
    return { error: "Failed to queue notification" }
  }
}

// ==================== GRACEFUL SHUTDOWN ====================

export async function closeNotificationQueue() {
  await notificationQueue.close()
}

// ==================== EVENT LISTENERS ====================

notificationQueue.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message)
})

notificationQueue.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`)
})

export default notificationQueue
