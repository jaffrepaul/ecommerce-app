import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  // Get user from JWT token (no DB call!)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  if (token) {
    // Set user context first
    Sentry.setUser({
      id: token.sub || '',
      email: token.email || '',
      username: token.name || '',
    })

    // Set companyId as scope attribute - automatically applied to all logs
    Sentry.getIsolationScope().setAttribute('companyId', token.companyId as string)

    // Use Sentry logger to ensure scope is properly set
    // This will have the companyId attribute!
    Sentry.logger.info('Middleware: User authenticated', {
      userId: token.sub,
      companyId: token.companyId,
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
