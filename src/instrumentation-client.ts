import * as Sentry from "@sentry/nextjs";

// Browser-side error tracking. Deliberately no Session Replay: this UI
// constantly shows patient names, diagnoses, and MLC details on screen —
// recording/screenshotting sessions to a third party is not something to
// turn on without an explicit decision, so it's left off rather than
// defaulted on.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
