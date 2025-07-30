// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Filter logs before sending to Sentry
  beforeSendLog: (log) => {
    // Example: Filter out logs with specific messages
    if (log.message.includes('Test message')) {
      return null; // Don't send this log
    }
    
    // Example: Filter out logs with specific attributes
    if (log.attributes?.module === 'test') {
      return null; // Don't send this log
    }
    
    // Example: Filter out debug level logs
    if (log.level === 'debug') {
      return null; // Don't send debug logs
    }
    
    return log; // Send all other logs
  },

  // Add console logging integration to automatically send console logs to Sentry
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
  ],

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
