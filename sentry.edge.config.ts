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

  // Enable logs to be sent to Sentry (only in production)
  enableLogs: isProduction,

  // Only send console logs to Sentry in production
  // In development, logs will only appear in the console
  integrations: isProduction
    ? [Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] })]
    : [],

  initialScope: (scope) => {
    scope.setTag('companyId', 'foo-bar-123');
    scope.setTag('setBy', 'edge-config-initialScope');
    return scope;
  },

  // Enable debug mode only in development
  debug: isDevelopment,
  
  // Optional: Disable Sentry entirely in development
  enabled: isProduction,
});
