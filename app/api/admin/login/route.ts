import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set('rtm_admin', process.env.ADMIN_SECRET!, {
    httpOnly: true,
    secure:   true,
    maxAge:   60 * 60 * 24 * 7, // 7 days
    path:     '/',
  })
  return res
}
