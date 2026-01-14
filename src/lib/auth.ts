import { getServerSession } from 'next-auth'
import { authOptions } from './auth-config'

/**
 * Get the current user's company ID from the authenticated session
 * No database call - reads from JWT token
 */
export async function getCompanyIdFromSession(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return null
    }

    const user = session.user as { companyId?: string }
    return user.companyId || null
  } catch (error) {
    console.error('Error getting companyId from session:', error)
    return null
  }
}

/**
 * Get the current authenticated user's information
 * No database call - reads from JWT token
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return null
    }

    const user = session.user as { id?: string; email?: string | null; name?: string | null; companyId?: string }
    return {
      id: user.id || user.email || '',
      email: user.email || '',
      name: user.name || '',
      companyId: user.companyId || '',
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}




