import { NextRequest } from 'next/server'

/**
 * Checks the 'rtm_admin' cookie set by /api/admin/login against ADMIN_SECRET.
 * Use at the top of any protected admin API route:
 *
 *   if (!isAdminAuthed(req)) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   }
 */
export function isAdminAuthed(req: NextRequest): boolean {
  const cookie = req.cookies.get('rtm_admin')?.value
  return !!cookie && cookie === process.env.ADMIN_SECRET
}