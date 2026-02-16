import * as Sentry from "@sentry/nextjs"

/**
 * Initialize Sentry for error tracking and monitoring
 */
export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: process.env.NODE_ENV !== "production",
    
    // Performance Monitoring
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],

    // Capture unhandled exceptions
    beforeSend(event) {
      // Filter out errors in development
      if (process.env.NODE_ENV === "development") {
        return null
      }
      return event
    },
  })
}

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: {
      app: context,
    },
  })
}

/**
 * Capture message
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  Sentry.captureMessage(message, level)
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  category: string = "user-action",
  level: "info" | "warning" | "error" = "info",
  data?: Record<string, any>,
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Start performance transaction
 */
export function startTransaction(name: string, op: string = "http.request") {
  return Sentry.startTransaction({
    name,
    op,
  })
}

/**
 * Set user context
 */
export function setUserContext(userId: string, email?: string, role?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username: role,
  })
}

/**
 * Clear user context
 */
export function clearUserContext() {
  Sentry.setUser(null)
}

/**
 * Set global tags for filtering
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value)
}

/**
 * Track domain-specific events
 */
export function trackEvent(domain: string, action: string, data?: Record<string, any>) {
  addBreadcrumb(`${domain}:${action}`, domain, "info", data)
}

/**
 * Track appointment events
 */
export function trackAppointmentEvent(action: "create" | "cancel" | "reschedule" | "checkin", appointmentId: string) {
  trackEvent("appointments", action, { appointmentId })
}

/**
 * Track queue events
 */
export function trackQueueEvent(action: "create" | "call" | "complete" | "noshow", ticketId: string) {
  trackEvent("queue", action, { ticketId })
}

/**
 * Track admin events
 */
export function trackAdminEvent(
  action: "create_professional" | "close_queue" | "generate_report",
  resourceId: string,
) {
  trackEvent("admin", action, { resourceId })
}

/**
 * Track notification events
 */
export function trackNotificationEvent(
  action: "send" | "failed" | "read",
  notificationId: string,
  channel?: string,
) {
  trackEvent("notifications", action, { notificationId, channel })
}

export default Sentry
