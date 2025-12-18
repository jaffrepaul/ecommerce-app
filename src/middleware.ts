import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getCompanyIdFromSession } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  // ✅ SAFEST METHOD: Get company ID from authenticated session on server
  const companyId = await getCompanyIdFromSession()
  
  // Set company ID in Sentry scope for this request
  if (companyId) {
    Sentry.setTag('companyId', companyId)
    Sentry.setTag('setBy', 'middleware-SECURE')
    
    console.log(`✅ [Middleware] CompanyId set securely: ${companyId} for ${request.nextUrl.pathname}`)
    
    // Also set as context for richer data
    Sentry.setContext('company', {
      id: companyId,
    })
  } else {
    console.warn('⚠️ [Middleware] No companyId found in session')
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
