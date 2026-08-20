import NextAuth, { DefaultSession, DefaultUser } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import { Role } from '@/generated/prisma'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      shopId: string | null
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: Role
    shopId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    shopId: string | null
  }
}
