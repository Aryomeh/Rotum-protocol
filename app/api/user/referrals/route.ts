import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { count, error } = await supabaseAdmin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', userId)

    if (error) {
      console.error('[GET /api/user/referrals] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch referral stats' }, { status: 500 })
    }

    const total = count ?? 0
    const bonus = total * 5

    return NextResponse.json({ total, bonus })
  } catch (err) {
    console.error('[GET /api/user/referrals] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}