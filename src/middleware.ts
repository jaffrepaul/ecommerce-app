import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getCurrentUser } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  // Get user from session
  const user = await getCurrentUser()
  
  if (user) {
    // Set user context
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    })
    
    // Set companyId on isolation scope (request-level) - automatically added to all logs, spans, and errors
    // Using getIsolationScope() instead of getCurrentScope() as per Sentry 10.32.0 scope hierarchy
    Sentry.getIsolationScope().setAttributes({ 
      companyId: user.companyId 
    })
    
    console.log(`✅ [Middleware] User + companyId attribute set: ${user.companyId}`)
  } else {
    Sentry.setUser(null)
    console.warn('⚠️ [Middleware] No user found in session')
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
