import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    id: string
    companyId: string
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      companyId: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    companyId: string
  }
}
