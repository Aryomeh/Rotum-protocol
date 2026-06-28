import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect /admin routes
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const auth = req.cookies.get('rtm_admin')?.value
  if (auth === process.env.ADMIN_SECRET) return NextResponse.next()

  // Redirect to login
  const loginUrl = new URL('/admin/login', req.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*'],
}