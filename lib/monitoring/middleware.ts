import * as Sentry from "@sentry/nextjs"

/**
 * Wrap a server action with Sentry monitoring
 */
export function withMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  { 
    action, 
    domain = "default" 
  }: { 
    action: string
    domain?: string 
  },
): T {
  return (async (...args: any[]) => {
    const transaction = Sentry.startTransaction({
      name: `${domain}:${action}`,
      op: "function",
    })

    try {
      Sentry.addBreadcrumb({
        message: `Starting ${domain}:${action}`,
        category: domain,
        level: "info",
        data: { action },
      })

      const result = await fn(...args)

      Sentry.addBreadcrumb({
        message: `Completed ${domain}:${action}`,
        category: domain,
        level: "info",
        data: { action, success: true },
      })

      return result
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          domain,
          action,
          error_source: "server_action",
        },
        contexts: {
          function: {
            name: `${domain}:${action}`,
            args: args.length,
          },
        },
      })

      Sentry.addBreadcrumb({
        message: `Failed ${domain}:${action}`,
        category: domain,
        level: "error",
        data: { action, error: error instanceof Error ? error.message : String(error) },
      })

      throw error
    } finally {
      transaction.finish()
    }
  }) as T
}

/**
 * Wrap API route handlers with monitoring
 */
export function withAPIMonitoring<T extends (req: any, res: any) => Promise<any>>(
  handler: T,
  { endpoint, domain = "api" }: { endpoint: string; domain?: string },
): T {
  return (async (req: any, res: any) => {
    const transaction = Sentry.startTransaction({
      name: `${domain}:${endpoint}`,
      op: "http.server",
      data: {
        method: req.method,
        url: req.url,
      },
    })

    try {
      Sentry.setContext("http", {
        method: req.method,
        url: req.url,
        status: res.statusCode,
      })

      const result = await handler(req, res)
      return result
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          domain,
          endpoint,
          error_source: "api_route",
          http_method: req.method,
        },
        contexts: {
          http: {
            method: req.method,
            url: req.url,
            status: res.statusCode || 500,
          },
        },
      })

      throw error
    } finally {
      transaction.finish()
    }
  }) as T
}

/**
 * Capture service errors with context
 */
export function captureServiceError(
  error: Error,
  context: {
    domain: string
    action: string
    userId?: string
    resourceId?: string
    additionalData?: Record<string, any>
  },
) {
  Sentry.captureException(error, {
    tags: {
      domain: context.domain,
      action: context.action,
    },
    contexts: {
      service: {
        domain: context.domain,
        action: context.action,
        userId: context.userId,
        resourceId: context.resourceId,
        ...context.additionalData,
      },
    },
  })
}
