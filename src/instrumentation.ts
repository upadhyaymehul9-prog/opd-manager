import * as Sentry from "@sentry/nextjs";

// Server + edge runtime error tracking. No performance tracing (this is a
// small clinic app — the goal is catching real exceptions, not APM, and it
// keeps us comfortably inside the free-tier event quota).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0,
      // Patient names/diagnoses pass through request data constantly — never
      // let Sentry attach IPs/headers/cookies by default. api-error.ts scrubs
      // exceptions explicitly before sending instead of relying on defaults.
      sendDefaultPii: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
