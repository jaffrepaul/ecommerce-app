// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { getClientCompanyId } from "@/lib/sentryContext";

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
  
  // Add companyId to logs from multiple sources
  beforeSendLog: (log) => {
    // METHOD 1: Global variable (current approach)
    const companyIdFromGlobal = getClientCompanyId();
    
    // METHOD 2: getCurrentScope() - testing if this is reliable
    const currentScope = Sentry.getCurrentScope();
    const currentScopeData = currentScope.getScopeData();
    const companyIdFromCurrentScope = currentScopeData?.tags?.companyId;
    
    // METHOD 3: getIsolationScope() - the fallback
    const isolationScope = Sentry.getIsolationScope();
    const isolationScopeData = isolationScope.getScopeData();
    const companyIdFromIsolationScope = isolationScopeData?.tags?.companyId;
    
    // Log comparison for testing
    if (isDevelopment) {
      console.log('🔍 beforeSendLog scope comparison:');
      console.log('  - fromGlobal:', companyIdFromGlobal);
      console.log('  - fromCurrentScope:', companyIdFromCurrentScope);
      console.log('  - fromIsolationScope:', companyIdFromIsolationScope);
      console.log('  - allMatch:', companyIdFromGlobal === companyIdFromCurrentScope && 
                  companyIdFromGlobal === companyIdFromIsolationScope);
      console.log('  - logMessage:', typeof log.message === 'string' ? log.message.substring(0, 50) : 'N/A');
    }
    
    // Use global variable first, fallback to isolation scope
    let companyId = companyIdFromGlobal;
    if (!companyId) {
      companyId = typeof companyIdFromIsolationScope === 'string' ? companyIdFromIsolationScope : null;
    }
    
    if (companyId) {
      log.attributes = {
        ...log.attributes,
        companyId,
        setBy: isDevelopment ? 'CLIENT-beforeSendLog' : undefined,
      };
    }
    return log;
  },
  
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
