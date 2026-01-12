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

  // Enable logs to be sent to Sentry
  enableLogs: true,
  
  integrations: [
    ...(isProduction
      ? [
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
          }),
        ]
      : []),
    // Send console logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] })
  ],

  // Enable debug mode only in development
  debug: isDevelopment,
  
  // Enable Sentry in all environments (set to isProduction to disable in dev)
  enabled: true,
});

// Export for router navigation tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
