import { NextRequest, NextResponse } from "next/server"
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"
import { NotificationJob } from "@/lib/workers/notification-queue"
import { createServerClient } from "@/lib/supabase/server"

/**
 * Handle notification processing from Upstash QStash
 * This endpoint is called by QStash when a notification job is ready to process
 */
async function handler(req: NextRequest) {
  // Only accept POST
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    // Get notification job from request body
    const notification: NotificationJob = await req.json()

    // Validate notification
    if (!notification.notificationId || !notification.userId || !notification.channel) {
      return NextResponse.json(
        { error: "Invalid notification payload" },
        { status: 400 },
      )
    }

    const supabase = await createServerClient()

    // Update status to 'sending'
    await supabase
      .from("notifications")
      .update({
        status: "sending",
        attempt: (notification.attempt || 0) + 1,
      })
      .eq("id", notification.notificationId)

    // Process based on channel
    switch (notification.channel) {
      case "email":
        await processEmailNotification(notification)
        break
      case "sms":
        await processSMSNotification(notification)
        break
      case "push":
        await processPushNotification(notification)
        break
      default:
        throw new Error(`Unknown notification channel: ${notification.channel}`)
    }

    // Mark as sent
    await supabase
      .from("notifications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", notification.notificationId)

    return NextResponse.json(
      { success: true, notificationId: notification.notificationId },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error processing notification:", error)

    // Mark as failed
    const notification = (await req.json()) as NotificationJob
    const supabase = await createServerClient()

    await supabase
      .from("notifications")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", notification.notificationId)

    // Return 200 so QStash doesn't retry forever
    // The notification is already marked as failed in DB
    return NextResponse.json(
      {
        success: false,
        notificationId: notification.notificationId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 },
    )
  }
}

/**
 * Process email notification
 */
async function processEmailNotification(notification: NotificationJob) {
  // TODO: Implement with your email provider
  // Example with Resend:
  /*
  import { Resend } from "resend"
  
  const resend = new Resend(process.env.RESEND_API_KEY)
  
  const supabase = await createServerClient()
  const { data: user } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", notification.userId)
    .single()
  
  await resend.emails.send({
    from: "noreply@citaverde.com",
    to: user.email,
    subject: notification.subject,
    html: notification.message,
  })
  */

  console.log(`[EMAIL] Processed: ${notification.notificationId}`)
}

/**
 * Process SMS notification
 */
async function processSMSNotification(notification: NotificationJob) {
  // TODO: Implement with your SMS provider
  // Example with Twilio:
  /*
  import twilio from "twilio"
  
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  
  const supabase = await createServerClient()
  const { data: user } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", notification.userId)
    .single()
  
  await client.messages.create({
    body: notification.message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: user.phone,
  })
  */

  console.log(`[SMS] Processed: ${notification.notificationId}`)
}

/**
 * Process push notification
 */
async function processPushNotification(notification: NotificationJob) {
  // TODO: Implement with your push provider
  // Example with Firebase:
  /*
  import admin from "firebase-admin"
  
  const supabase = await createServerClient()
  const { data: user } = await supabase
    .from("profiles")
    .select("fcm_token")
    .eq("id", notification.userId)
    .single()
  
  await admin.messaging().send({
    notification: {
      title: notification.subject,
      body: notification.message,
    },
    token: user.fcm_token,
  })
  */

  console.log(`[PUSH] Processed: ${notification.notificationId}`)
}

// Wrap with QStash signature verification
export const POST = verifySignatureAppRouter(handler)
