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
  
  // Add companyId to ALL logs from scope (set by middleware)
  beforeSendLog: (log) => {
    // SECURE: Read from Sentry's per-request scope (set by middleware/API routes)
    const scope = Sentry.getCurrentScope();
    const scopeData = scope.getScopeData();
    const companyId = scopeData.tags?.companyId;
    
    if (companyId) {
      if (!log.attributes) {
        log.attributes = {};
      }
      log.attributes.companyId = companyId;
      log.attributes.setBy = 'SERVER-beforeSendLog-SECURE'; // For debugging - shows where companyId was set
    }
    
    return log;
  },

  // Add console logging integration to automatically send console logs to Sentry
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
  ],

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: true,
});
