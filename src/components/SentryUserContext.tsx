'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { setClientCompanyId } from '@/lib/sentryContext'

interface SentryUserContextProps {
  userId: string
  userEmail: string
  userName: string
  companyId: string
}

export function SentryUserContext({ 
  userId,
  userEmail,
  userName,
  companyId
}: SentryUserContextProps) {
  useEffect(() => {
    // Set user context
    Sentry.setUser({
      id: userId,
      email: userEmail,
      username: userName,
    })
    
    // Store companyId in global storage for client-side beforeSendLog
    setClientCompanyId(companyId)
    
    // Also set as tag for filtering in Sentry UI
    Sentry.getIsolationScope().setTag('companyId', companyId)
    
    console.log(`✅ [Client] Sentry user + companyId set: ${companyId}`)
  }, [userId, userEmail, userName, companyId])

  return null
}
