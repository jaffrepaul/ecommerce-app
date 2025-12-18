'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { setCompanyId } from '@/lib/sentryContext'

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
    
    // Store companyId globally for beforeSendLog to use
    setCompanyId(companyId)
    
    console.log(`✅ [Client] Sentry user + companyId stored: ${companyId}`)
  }, [userId, userEmail, userName, companyId])

  return null
}
