import { cookies } from 'next/headers'

// Simple user database simulation
const MOCK_USERS = {
  'user-1': {
    id: 'user-1',
    email: 'alice@company-xyz.com',
    name: 'Alice',
    companyId: 'company-xyz-456',
  },
  'user-2': {
    id: 'user-2',
    email: 'bob@company-abc.com',
    name: 'Bob',
    companyId: 'company-abc-123',
  },
  'demo': {
    id: 'demo',
    email: 'demo@company-demo.com',
    name: 'Demo User',
    companyId: 'company-demo-789',
  },
}

/**
 * Get the current user's company ID from the authenticated session
 */
export async function getCompanyIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      console.log('⚠️ No userId cookie found')
      return null
    }
    
    const user = MOCK_USERS[userId as keyof typeof MOCK_USERS]
    if (!user) {
      console.log(`⚠️ User ${userId} not found`)
      return null
    }
    
    return user.companyId
  } catch (error) {
    console.error('Error getting companyId from session:', error)
    return null
  }
}

/**
 * Get the current authenticated user's information
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      // Return default demo user if not authenticated
      return MOCK_USERS['demo']
    }
    
    const user = MOCK_USERS[userId as keyof typeof MOCK_USERS]
    return user || MOCK_USERS['demo']
  } catch (error) {
    console.error('Error getting current user:', error)
    return MOCK_USERS['demo']
  }
}

/**
 * Login a user (sets cookie)
 */
export async function login(userId: string) {
  const cookieStore = await cookies()
  cookieStore.set('userId', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  })
}

/**
 * Logout the current user (removes cookie)
 */
export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('userId')
}
