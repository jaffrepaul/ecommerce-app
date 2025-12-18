// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Session Replay (only in production to avoid dev noise)
  replaysSessionSampleRate: isProduction ? 0.1 : 0,
  replaysOnErrorSampleRate: isProduction ? 1.0 : 0,
  
  // Enable logs to be sent to Sentry (only in production)
  enableLogs: isProduction,
  
  // Note: Scope attributes (like companyId set in SentryUserContext) are automatically 
  // added to all logs, spans, and errors - no beforeSendLog hook needed!
  
  integrations: [
    ...(isProduction
      ? [
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
          }),
        ]
      : []),
    // Only send console logs to Sentry in production
    // In development, logs will only appear in the browser console
    ...(isProduction
      ? [Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] })]
      : []),
  ],

  // Enable debug mode only in development
  debug: isDevelopment,
  
  // Optional: Disable Sentry entirely in development
  enabled: isProduction,
});

// Export for router navigation tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
