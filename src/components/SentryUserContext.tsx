'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { setClientCompanyId } from '@/lib/sentryContext'

interface SentryUserContextProps {
  userId?: string
  userEmail?: string
  userName?: string
  companyId?: string
}

export function SentryUserContext({ 
  userId = 'demo-user',
  userEmail = 'demo@example.com',
  userName = 'Demo User',
  companyId
}: SentryUserContextProps) {
  useEffect(() => {
    // Set user context
    Sentry.setUser({
      id: userId,
      email: userEmail,
      username: userName
    })
    
    // Store companyId globally for beforeSendLog to access
    if (companyId) {
      setClientCompanyId(companyId)
      Sentry.setTag('companyId', companyId)
      Sentry.setTag('setBy', 'client-SentryUserContext-SECURE') // For debugging - shows where companyId was set
      console.log(`✅ [Client] CompanyId stored: ${companyId}`)
    } else {
      setClientCompanyId(null)
      console.warn('⚠️ [Client] No companyId provided')
    }
  }, [userId, userEmail, userName, companyId])

  return null
}
