import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getCurrentUser } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  // Get user from session
  const user = await getCurrentUser()
  
  if (user) {
    // Set user context first
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    })
    
    // Set companyId on isolation scope as a tag (will be read by beforeSendLog)
    Sentry.getIsolationScope().setTag('companyId', user.companyId)
    
    // Use Sentry logger to ensure scope is properly set
    // This will have the companyId attribute!
    Sentry.logger.info('Middleware: User authenticated', {
      userId: user.id,
      companyId: user.companyId,
    })
  } else {
    Sentry.setUser(null)
    Sentry.logger.warn('Middleware: No user found in session')
  }
  
  return NextResponse.next()
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
