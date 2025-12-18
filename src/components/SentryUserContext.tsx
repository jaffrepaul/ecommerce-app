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
    
    // Set companyId as scope attribute - automatically added to all logs, spans, and errors
    Sentry.getCurrentScope().setAttributes({ 
      companyId: companyId 
    })
    
    console.log(`✅ [Client] Sentry user + companyId attribute set: ${companyId}`)
  }, [userId, userEmail, userName, companyId])

  return null
}
