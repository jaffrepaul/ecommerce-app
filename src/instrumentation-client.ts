// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Enable logs to be sent to Sentry
  enableLogs: true,
  
  // Add companyId to log attributes
  beforeSendLog: (log) => {
    // SECURE: Read from Sentry's client scope (set by SentryUserContext)
    const scope = Sentry.getCurrentScope();
    const companyId = scope.getScopeData().tags?.companyId;
    
    if (companyId) {
      if (!log.attributes) {
        log.attributes = {};
      }
      log.attributes.companyId = companyId;
      console.log('[CLIENT beforeSendLog] ✅ Added companyId:', companyId);
    } else {
      console.log('[CLIENT beforeSendLog] ⚠️ No companyId in scope');
    }
    
    return log;
  },
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    // Add console logging integration to automatically send console logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
  ],

  // Enable debug mode to see what Sentry is doing
  debug: true,
});

// Export for router navigation tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
