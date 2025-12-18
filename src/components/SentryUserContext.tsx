'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

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
    
    // SECURE: Use Sentry's client-side scope (safe in browser - each user has own session)
    Sentry.setTag('companyId', companyId)
    
    console.log(`✅ [Client] Sentry user + companyId set: ${companyId}`)
  }, [userId, userEmail, userName, companyId])

  return null
}
