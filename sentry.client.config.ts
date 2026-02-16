import * as Sentry from "@sentry/nextjs"

export function initSentryClient() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: process.env.NODE_ENV !== "production",

    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    replaySessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replayOnErrorSampleRate: 1.0,

    beforeSend(event) {
      if (process.env.NODE_ENV === "development") {
        return null
      }
      return event
    },
  })
}
