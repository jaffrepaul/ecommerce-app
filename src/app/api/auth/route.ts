import { NextResponse } from 'next/server'
import { login, logout } from '@/lib/auth'

export async function POST(request: Request) {
  const { action, userId } = await request.json()

  try {
    if (action === 'login') {
      if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 })
      }
      
      await login(userId)
      return NextResponse.json({ success: true, message: `Logged in as ${userId}` })
    }

    if (action === 'logout') {
      await logout()
      return NextResponse.json({ success: true, message: 'Logged out' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
