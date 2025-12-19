// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Add companyId to logs from isolation scope tags
  beforeSendLog: (log) => {
    // Read from isolation scope where we set the tag
    const isolationScope = Sentry.getIsolationScope();
    const scopeData = isolationScope.getScopeData();
    const companyId = scopeData?.tags?.companyId;
    
    if (companyId) {
      log.attributes = {
        ...log.attributes,
        companyId,
        setBy: isDevelopment ? 'EDGE-beforeSendLog' : undefined,
      };
    }
    return log;
  },

  // Send console logs to Sentry
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] })
  ],

  // Enable debug mode only in development
  debug: isDevelopment,
  
  // Enable Sentry in all environments (set to isProduction to disable in dev)
  enabled: true,
});
