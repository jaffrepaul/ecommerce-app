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
    
    // Set company ID in Sentry scope for this request
    Sentry.setTag('companyId', user.companyId)
    Sentry.setTag('setBy', 'middleware-SECURE') // For debugging - shows where companyId was set
    
    console.log(`✅ [Middleware] User + companyId set: ${user.companyId} for ${request.nextUrl.pathname}`)
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
