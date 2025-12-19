'use client'

import { useState } from 'react'
import * as Sentry from '@sentry/nextjs'

export function AuthDemo() {
  const [message, setMessage] = useState('')

  const handleLogin = async (userId: string) => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', userId }),
    })
    const data = await response.json()
    setMessage(data.message || data.error)
    
    // Reload to see the new user context
    setTimeout(() => window.location.reload(), 500)
  }

  const handleLogout = async () => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    const data = await response.json()
    setMessage(data.message || data.error)
    
    // Reload to see the change
    setTimeout(() => window.location.reload(), 500)
  }

  const testSentry = () => {
    // Send a test message to Sentry to verify companyId is attached
    console.log('🧪 Testing Sentry with current companyId...')
    Sentry.captureMessage('Test: Checking if companyId is attached', 'info')
    setMessage('✅ Test message sent to Sentry! Check your dashboard.')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <h3 className="font-bold text-lg mb-3 text-gray-900">🔒 Auth Demo (Sentry Testing)</h3>
      
      <div className="space-y-2 mb-3">
        <button
          onClick={() => handleLogin('user-1')}
          className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-bold"
        >
          Login as Alice (company-xyz-456)
        </button>
        <button
          onClick={() => handleLogin('user-2')}
          className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-bold"
        >
          Login as Bob (company-abc-123)
        </button>
        <button
          onClick={() => handleLogin('demo')}
          className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm font-bold"
        >
          Login as Demo (company-demo-789)
        </button>
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-bold"
        >
          Logout
        </button>
        
        <div className="border-t pt-2 mt-2">
          <button
            onClick={testSentry}
            className="w-full px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm font-bold"
          >
            🧪 Test Send to Sentry
          </button>
        </div>
      </div>

      {message && (
        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
          {message}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-3">
        Check your browser console and Sentry to see the companyId change!
      </div>
    </div>
  )
}
