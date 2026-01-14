import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

// Simple user database simulation (same as before)
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

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userId) return null

        const user = MOCK_USERS[credentials.userId as keyof typeof MOCK_USERS]
        if (!user) return null

        // Return user object - will be stored in JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          companyId: user.companyId,
        }
      },
    }),
  ],
  callbacks: {
    // Include companyId in JWT token
    async jwt({ token, user }) {
      if (user && 'companyId' in user) {
        token.companyId = user.companyId as string
      }
      return token
    },
    // Include companyId in session
    async session({ session, token }) {
      if (session.user && token.companyId) {
        (session.user as { companyId?: string }).companyId = token.companyId as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt", // Use JWT strategy (no database needed)
  },
  pages: {
    signIn: '/', // Redirect to home page for sign in
  },
}
