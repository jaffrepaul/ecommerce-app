import * as Sentry from '@sentry/nextjs'
import { getCurrentUser } from './auth'

/**
 * Sets Sentry context (user + companyId) for the current request.
 * MUST be called at the start of every API route handler to ensure
 * all logs, errors, and spans have the companyId attribute.
 * 
 * This is necessary because Next.js middleware (Edge runtime) and API routes
 * (Node.js runtime) have separate Sentry instances - scope doesn't propagate!
 */
export async function setSentryContext(): Promise<void> {
  try {
    const user = await getCurrentUser()
    
    if (user) {
      // Set user context
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      })
      
      // Set companyId as tag (will be picked up by beforeSendLog)
      Sentry.getIsolationScope().setTag('companyId', user.companyId)
      
      console.log(`✅ [API] Sentry context set: user=${user.id}, companyId=${user.companyId}`)
    } else {
      console.warn('⚠️ [API] No user found in session')
    }
  } catch (error) {
    console.error('❌ [API] Failed to set Sentry context:', error)
  }
}
