// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry (only in production)
  enableLogs: isProduction,
  
  // Note: Scope attributes (like companyId set in middleware) are automatically 
  // added to all logs, spans, and errors - no beforeSendLog hook needed!

  // Only send console logs to Sentry in production
  // In development, logs will only appear in the console
  integrations: isProduction
    ? [Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] })]
    : [],

  // Enable debug mode only in development
  debug: isDevelopment,
  
  // Optional: Disable Sentry entirely in development
  enabled: isProduction,
});
