import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { nextUrl } = request
  const token = request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value

  const isLoggedIn = !!token
  const isAuthRoute = nextUrl.pathname.startsWith('/login')
  const isAdminRoute = nextUrl.pathname.startsWith('/admin')
  const isEmployeeRoute = nextUrl.pathname.startsWith('/employee')

  // Allow static assets and API auth routes
  if (
    nextUrl.pathname.startsWith('/api/auth') ||
    nextUrl.pathname.startsWith('/_next')
  ) {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to login (except if already on login page)
  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Redirect logged-in users away from login page
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
