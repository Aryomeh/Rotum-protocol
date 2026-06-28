import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('rtm_admin', '', { maxAge: 0, path: '/' })
  return res
}
