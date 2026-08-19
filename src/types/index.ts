import { DefaultSession } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'ADMIN' | 'EMPLOYEE'
      shopId: string
    } & DefaultSession['user']
  }

  interface User {
    role?: 'ADMIN' | 'EMPLOYEE'
    shopId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role: 'ADMIN' | 'EMPLOYEE'
    shopId: string
  }
}

// Shared types used across the app
export type UserRole = 'ADMIN' | 'EMPLOYEE'

export type ClockStatus = 'IN' | 'OUT' | 'UNKNOWN'

export type LeaveStatusType = 'PENDING' | 'APPROVED' | 'REJECTED'

export type PaySheetStatusType = 'DRAFT' | 'FINALIZED'

export interface NavItem {
  label: string
  href: string
  icon: string
}
